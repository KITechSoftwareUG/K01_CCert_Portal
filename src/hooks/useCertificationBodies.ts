import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/hooks/useActivityLog';


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
      // 1. Primary source: Active client certifications linked via auditors
      const { data: certData, error: certError } = await supabase
        .from('client_certifications')
        .select(`
          id,
          client_id,
          clients!inner ( id, is_active ),
          auditors (
            id,
            certification_body_id,
            certification_bodies ( id, name, short_name )
          )
        `);

      if (certError) throw certError;

      // 2. Secondary source: Direct links from client to certification bodies (fallback for missing auditors)
      const { data: linkData, error: linkError } = await supabase
        .from('client_certification_bodies')
        .select(`
          id,
          client_id,
          clients!inner ( id, is_active ),
          certification_bodies ( id, name, short_name )
        `);
        
      if (linkError) throw linkError;

      const counts: Record<string, CertificationBodyStat> = {};
      const countedClientBodies = new Set<string>();

      // Process primary data first (Certificates -> Auditors -> Body)
      for (const row of certData) {
        const client = row.clients as any;
        if (client?.is_active === false) continue;

        const auditor = row.auditors as any;
        const body = auditor?.certification_bodies;
        if (!body?.id) continue;

        // Remember we counted this client-body combo so we don't double count it from linkData
        countedClientBodies.add(`${row.client_id}-${body.id}`);

        if (!counts[body.id]) {
          counts[body.id] = {
            bodyId: body.id,
            bodyName: body.name,
            bodyShortName: body.short_name,
            count: 0,
          };
        }
        counts[body.id].count += 1;
      }

      // Process secondary data (Direct Client -> Body links)
      for (const row of linkData) {
        const client = row.clients as any;
        if (client?.is_active === false) continue;

        const body = row.certification_bodies as any;
        if (!body?.id) continue;

        // Only count it if we haven't already counted this body for this client via certificates
        const comboKey = `${row.client_id}-${body.id}`;
        if (!countedClientBodies.has(comboKey)) {
          countedClientBodies.add(comboKey);
          
          if (!counts[body.id]) {
            counts[body.id] = {
              bodyId: body.id,
              bodyName: body.name,
              bodyShortName: body.short_name,
              count: 0,
            };
          }
          counts[body.id].count += 1;
        }
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
    onSuccess: (data: any) => {
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
    onSuccess: (data: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['client_certification_bodies'] });
      logActivity({
        action: 'deleted',
        entity_type: 'certification_body',
        entity_id: id
      });
    },
  });
};

export const useClientCertificationBodies = (clientId?: string) => {
  return useQuery({
    queryKey: ['client_certification_bodies', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certification_bodies')
        .select(`
          id,
          certification_body_id,
          certification_bodies (*)
        `)
        .eq('client_id', clientId);

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
};

export const useClientsByCertificationBody = (certificationBodyId?: string) => {
  return useQuery({
    queryKey: ['clients_by_certification_body', certificationBodyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certification_bodies')
        .select(`
          id,
          client_id,
          clients (*)
        `)
        .eq('certification_body_id', certificationBodyId);

      if (error) throw error;
      return data;
    },
    enabled: !!certificationBodyId,
  });
};

export const useUpdateClientCertificationBodies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      certificationBodyIds
    }: {
      clientId: string;
      certificationBodyIds: string[]
    }) => {
      // First, delete all existing relationships
      const { error: deleteError } = await supabase
        .from('client_certification_bodies')
        .delete()
        .eq('client_id', clientId);

      if (deleteError) throw deleteError;

      // Then, insert new relationships
      if (certificationBodyIds.length > 0) {
        const { error: insertError } = await supabase
          .from('client_certification_bodies')
          .insert(
            certificationBodyIds.map(bodyId => ({
              client_id: clientId,
              certification_body_id: bodyId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client_certification_bodies', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients_by_certification_body'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};
