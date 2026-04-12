import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/hooks/useActivityLog';

// Explizite Typen für die Supabase-Join-Ergebnisse (Nested Selects)
interface CertDataRow {
  id: string;
  client_id: string;
  clients: { id: string; is_active: boolean } | null;
  certification_bodies: { id: string; name: string; short_name: string | null } | null;
  auditors: {
    id: string;
    certification_body_id: string | null;
    certification_bodies: { id: string; name: string; short_name: string | null } | null;
  } | null;
}

export interface CertificationBodyStat {
  bodyId: string;
  bodyName: string;
  bodyShortName: string | null;
  count: number;
}

export const useCertificationBodyStats = () => {
  return useQuery({
    queryKey: ['certification_body_stats'],
    queryFn: async () => {
      // Quelle: certification_body_id direkt auf client_certifications
      // Fallback: auditors.certification_body_id für Altdaten
      const { data: certData, error: certError } = await supabase
        .from('client_certifications')
        .select(`
          id,
          client_id,
          clients!inner ( id, is_active ),
          certification_bodies ( id, name, short_name ),
          auditors (
            id,
            certification_body_id,
            certification_bodies ( id, name, short_name )
          )
        `);

      if (certError) throw certError;

      const counts: Record<string, CertificationBodyStat> = {};
      const countedClientBodies = new Set<string>();

      const upsertCount = (body: { id: string; name: string; short_name: string | null }, clientId: string) => {
        const comboKey = `${clientId}-${body.id}`;
        if (countedClientBodies.has(comboKey)) return;
        countedClientBodies.add(comboKey);
        if (!counts[body.id]) {
          counts[body.id] = { bodyId: body.id, bodyName: body.name, bodyShortName: body.short_name, count: 0 };
        }
        counts[body.id].count += 1;
      };

      for (const row of certData as unknown as CertDataRow[]) {
        if (row.clients?.is_active === false) continue;

        const directBody = row.certification_bodies;
        const auditorBody = row.auditors?.certification_bodies;
        const body = directBody ?? auditorBody;
        if (!body?.id) continue;

        upsertCount(body, row.client_id);
      }

      return Object.values(counts).sort((a, b) => b.count - a.count || a.bodyName.localeCompare(b.bodyName, 'de'));
    },
  });
};

export interface CertificationBody {
  id: string;
  name: string;
  short_name: string | null;
  website: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export const useCertificationBodies = () => {
  return useQuery({
    queryKey: ['certification_bodies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certification_bodies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as CertificationBody[];
    },
  });
};

export const useCreateCertificationBody = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      short_name?: string;
      website?: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      address?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('certification_bodies')
        .insert(body)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['certification_bodies'] });
      logActivity({
        action: 'created',
        entity_type: 'certification_body',
        entity_id: data.id,
        entity_name: data.short_name || data.name
      });
    },
  });
};

export const useUpdateCertificationBody = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: string;
      name?: string;
      short_name?: string;
      website?: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      address?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('certification_bodies')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['certification_bodies'] });
      logActivity({
        action: 'updated',
        entity_type: 'certification_body',
        entity_id: data.id,
        entity_name: data.name
      });
    },
  });
};

export const useDeleteCertificationBody = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('certification_bodies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['certification_bodies'] });
      logActivity({
        action: 'deleted',
        entity_type: 'certification_body',
        entity_id: id,
        details: { note: 'Zertifizierer gelöscht' }
      });
    },
  });
};

// Returns distinct certification bodies linked to a client via client_certifications
export const useClientCertificationBodies = (clientId?: string) => {
  return useQuery({
    queryKey: ['client_certification_bodies', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certifications')
        .select(`
          id,
          certification_body_id,
          certification_bodies (*)
        `)
        .eq('client_id', clientId!)
        .not('certification_body_id', 'is', null);

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
};

// Returns distinct clients linked to a certification body via client_certifications
export const useClientsByCertificationBody = (certificationBodyId?: string) => {
  return useQuery({
    queryKey: ['clients_by_certification_body', certificationBodyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certifications')
        .select(`
          id,
          client_id,
          clients (*)
        `)
        .eq('certification_body_id', certificationBodyId!);

      if (error) throw error;

      // Deduplicate by client_id (a client may have multiple certifications with the same body)
      const seen = new Set<string>();
      return (data || []).filter(row => {
        if (!row.client_id || seen.has(row.client_id)) return false;
        seen.add(row.client_id);
        return true;
      });
    },
    enabled: !!certificationBodyId,
  });
};
