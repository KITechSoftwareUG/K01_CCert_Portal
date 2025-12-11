import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';

export type DbAudit = Tables<'audits'>;
export type DbAuditInsert = TablesInsert<'audits'>;
export type AuditType = Enums<'audit_type'>;
export type AuditStatus = Enums<'audit_status'>;

export type AuditWithClient = DbAudit & {
  clients: Tables<'clients'> | null;
};

export const useAudits = () => {
  return useQuery({
    queryKey: ['audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          clients (*)
        `)
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data as AuditWithClient[];
    },
  });
};

export const useAudit = (id: string) => {
  return useQuery({
    queryKey: ['audits', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          clients (*)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as AuditWithClient | null;
    },
    enabled: !!id,
  });
};

export const useCreateAudit = () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    },
  });
};

export const useUpdateAudit = () => {
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
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    },
  });
};

export const useDeleteAudit = () => {
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
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    },
  });
};
