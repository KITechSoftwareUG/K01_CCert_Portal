import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';
import { logActivity } from '@/hooks/useActivityLog';

export type DbAuditTask = Tables<'audit_tasks'>;
export type DbAuditTaskInsert = TablesInsert<'audit_tasks'>;
export type TaskStatus = Enums<'task_status'>;

export interface DbAuditTaskWithAudit extends DbAuditTask {
  audits: { id: string; client_id: string; type: string; scheduled_date: string } | null;
}

export interface DbAuditTaskFull extends DbAuditTask {
  audits: {
    id: string;
    type: string;
    scheduled_date: string;
    client_id: string;
    auditor_id: string | null;
    clients: {
      id: string;
      name: string;
      consultants: { id: string; name: string } | null;
    } | null;
    auditors: { id: string; name: string } | null;
  } | null;
}

export const useAuditTasks = (auditId?: string) => {
  return useQuery({
    queryKey: ['audit_tasks', auditId],
    queryFn: async () => {
      let query = supabase
        .from('audit_tasks')
        .select('*')
        .order('due_date', { ascending: true })
        .limit(10000);

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
            scheduled_date
          )
        `)
        .eq('audits.client_id', clientId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as DbAuditTaskWithAudit[];
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
            id,
            type,
            scheduled_date,
            client_id,
            auditor_id,
            clients (
              id,
              name,
              consultants (
                id,
                name
              )
            ),
            auditors (
              id,
              name
            )
          )
        `)
        .order('due_date', { ascending: true })
        .limit(10000);

      if (error) throw error;
      return data as DbAuditTaskFull[];
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit_tasks'] });
      logActivity({ action: 'created', entity_type: 'audit_task', entity_id: data.id, entity_name: data.title });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit_tasks'] });
      logActivity({ action: 'updated', entity_type: 'audit_task', entity_id: data.id, entity_name: data.title });
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
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['audit_tasks'] });
      logActivity({ action: 'deleted', entity_type: 'audit_task', entity_id: id });
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
