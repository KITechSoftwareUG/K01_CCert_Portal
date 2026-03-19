import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';

export type DbAuditTask = Tables<'audit_tasks'>;
export type DbAuditTaskInsert = TablesInsert<'audit_tasks'>;
export type TaskStatus = Enums<'task_status'>;

export const useAuditTasks = (auditId?: string) => {
  return useQuery({
    queryKey: ['audit_tasks', auditId],
    queryFn: async () => {
      let query = supabase
        .from('audit_tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (auditId) {
        query = query.eq('audit_id', auditId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DbAuditTask[];
    },
  });
};

export const useClientAuditTasks = (clientId: string) => {
  return useQuery({
    queryKey: ['audit_tasks', 'client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_tasks')
        .select(`
          *,
          audits!inner (
            id,
            client_id,
            type,
            date
          )
        `)
        .eq('audits.client_id', clientId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
};

export const useAllAuditTasks = () => {
  return useQuery({
    queryKey: ['audit_tasks', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_tasks')
        .select(`
          *,
          audits (
            *,
            clients (*)
          )
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateAuditTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: DbAuditTaskInsert) => {
      const { data, error } = await supabase
        .from('audit_tasks')
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_tasks'] });
    },
  });
};

export const useUpdateAuditTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbAuditTask> & { id: string }) => {
      const { data, error } = await supabase
        .from('audit_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_tasks'] });
    },
  });
};

export const useDeleteAuditTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('audit_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_tasks'] });
    },
  });
};

export const useCreateBulkAuditTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tasks: DbAuditTaskInsert[]) => {
      const { data, error } = await supabase
        .from('audit_tasks')
        .insert(tasks)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_tasks'] });
    },
  });
};
