import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';
import { logActivity } from '@/hooks/useActivityLog';

export type DbAudit = Tables<'audits'>;
export type DbAuditInsert = TablesInsert<'audits'>;
export type AuditType = Enums<'audit_type'>;
export type AuditStatus = Enums<'audit_status'>;

export type CertificationAudit = DbAudit & {
  auditors: Tables<'auditors'> | null;
  certification_bodies: Tables<'certification_bodies'> | null;
};

export const useCertificationAudits = (clientCertificationId: string | undefined) => {
  return useQuery({
    queryKey: ['certification-audits', clientCertificationId],
    queryFn: async () => {
      if (!clientCertificationId) return [];
      
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          auditors (*),
          certification_bodies (*)
        `)
        .eq('client_certification_id', clientCertificationId)
        .order('scheduled_date', { ascending: false });
      
      if (error) throw error;
      return data as CertificationAudit[];
    },
    enabled: !!clientCertificationId,
  });
};

export const useCreateCertificationAudit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (audit: DbAuditInsert) => {
      const { data, error } = await supabase
        .from('audits')
        .insert(audit)
        .select()
        .single();
      
      if (error) throw error;

      // Auto-link certification body to client if not already linked
      try {
        if (data && data.certification_body_id && data.client_id) {
          const { data: existingLink } = await supabase
            .from('client_certification_bodies')
            .select('id')
            .eq('client_id', data.client_id)
            .eq('certification_body_id', data.certification_body_id)
            .maybeSingle();

          if (!existingLink) {
            await supabase
              .from('client_certification_bodies')
              .insert({
                client_id: data.client_id,
                certification_body_id: data.certification_body_id
              });
          }
        }
      } catch (err) {
        console.error('Error auto-linking certification body:', err);
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['certification-audits', variables.client_certification_id] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      logActivity({ action: 'created', entity_type: 'audit', entity_id: data.id });
    },
  });
};

export const useUpdateCertificationAudit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbAudit> & { id: string }) => {
      const { data, error } = await supabase
        .from('audits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Auto-link certification body to client if not already linked
      try {
        if (data && data.certification_body_id && data.client_id) {
          const { data: existingLink } = await supabase
            .from('client_certification_bodies')
            .select('id')
            .eq('client_id', data.client_id)
            .eq('certification_body_id', data.certification_body_id)
            .maybeSingle();

          if (!existingLink) {
            await supabase
              .from('client_certification_bodies')
              .insert({
                client_id: data.client_id,
                certification_body_id: data.certification_body_id
              });
          }
        }
      } catch (err) {
        console.error('Error auto-linking certification body:', err);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['certification-audits'] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      logActivity({ action: 'updated', entity_type: 'audit', entity_id: data.id });
    },
  });
};

export const useDeleteCertificationAudit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('audits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['certification-audits'] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      logActivity({ action: 'deleted', entity_type: 'audit', entity_id: id });
    },
  });
};
