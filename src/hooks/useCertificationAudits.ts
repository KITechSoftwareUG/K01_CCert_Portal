import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';

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
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['certification-audits', variables.client_certification_id] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certification-audits'] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certification-audits'] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    },
  });
};
