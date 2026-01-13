import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbAuditor = Tables<'auditors'>;
export type DbAuditorInsert = TablesInsert<'auditors'>;
export type DbAuditorUpdate = TablesUpdate<'auditors'>;

export type AuditorWithCertificationBody = DbAuditor & {
  certification_bodies: Tables<'certification_bodies'> | null;
};

// Get all auditors
export const useAuditors = () => {
  return useQuery({
    queryKey: ['auditors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditors')
        .select(`
          *,
          certification_bodies (*)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as AuditorWithCertificationBody[];
    },
  });
};

// Get a single auditor
export const useAuditor = (id: string | undefined) => {
  return useQuery({
    queryKey: ['auditors', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditors')
        .select(`
          *,
          certification_bodies (*)
        `)
        .eq('id', id!)
        .maybeSingle();
      
      if (error) throw error;
      return data as AuditorWithCertificationBody | null;
    },
    enabled: !!id,
  });
};

// Get auditors by certification body
export const useAuditorsByCertificationBody = (certificationBodyId: string | undefined) => {
  return useQuery({
    queryKey: ['auditors', 'by-cert-body', certificationBodyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditors')
        .select(`
          *,
          certification_bodies (*)
        `)
        .eq('certification_body_id', certificationBodyId!)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as AuditorWithCertificationBody[];
    },
    enabled: !!certificationBodyId,
  });
};

// Create an auditor
export const useCreateAuditor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (auditor: DbAuditorInsert) => {
      const { data, error } = await supabase
        .from('auditors')
        .insert(auditor)
        .select(`
          *,
          certification_bodies (*)
        `)
        .single();
      
      if (error) throw error;
      return data as AuditorWithCertificationBody;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditors'] });
    },
  });
};

// Update an auditor
export const useUpdateAuditor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: DbAuditorUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('auditors')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          certification_bodies (*)
        `)
        .single();
      
      if (error) throw error;
      return data as AuditorWithCertificationBody;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditors'] });
    },
  });
};

// Delete an auditor
export const useDeleteAuditor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('auditors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditors'] });
    },
  });
};
