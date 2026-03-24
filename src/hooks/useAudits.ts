import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';
import { useOutlookSync } from './useOutlookSync';
import { logActivity } from '@/hooks/useActivityLog';

export type DbAudit = Tables<'audits'>;
export type DbAuditInsert = TablesInsert<'audits'>;
export type AuditType = Enums<'audit_type'>;
export type AuditStatus = Enums<'audit_status'>;

export type AuditWithClient = DbAudit & {
  clients: Tables<'clients'> | null;
  client_certifications?: {
    id: string;
    certifications: Tables<'certifications'> | null;
  } | null;
  auditors?: {
    id: string;
    name: string;
  } | null;
  certification_bodies?: {
    id: string;
    name: string;
  } | null;
};

export const useAudits = () => {
  return useQuery({
    queryKey: ['audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          clients (*),
          client_certifications (
            id,
            certifications (*)
          ),
          auditors (id, name),
          certification_bodies (id, name)
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
          clients (*),
          client_certifications (
            id,
            certifications (*)
          ),
          auditors (id, name),
          certification_bodies (id, name)
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
  const { syncSingleAudit } = useOutlookSync();

  return useMutation({
    mutationFn: async (audit: DbAuditInsert & { clientName?: string }) => {
      const { clientName, ...auditData } = audit;
      const { data, error } = await supabase
        .from('audits')
        .insert(auditData)
        .select(`
          *,
          clients (name, address)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      logActivity({ action: 'created', entity_type: 'audit', entity_id: data.id, entity_name: data.clients?.name || 'Audit' });

      // Auto-sync to Outlook if connected
      if (data && data.clients) {
        await syncSingleAudit({
          id: data.id,
          clientName: data.clients.name || 'Unbekannt',
          type: data.type,
          scheduledDate: data.scheduled_date,
          certifications: data.certifications || [],
          notes: data.notes || undefined,
          clientAddress: data.clients.address || undefined,
        });
      }
    },
  });
};

export const useUpdateAudit = () => {
  const queryClient = useQueryClient();
  const { syncSingleAudit } = useOutlookSync();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbAudit> & { id: string }) => {
      const { data, error } = await supabase
        .from('audits')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          clients (name, address)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      logActivity({ action: 'updated', entity_type: 'audit', entity_id: data.id, entity_name: data.clients?.name || 'Audit' });

      // Auto-sync to Outlook if connected and audit is scheduled
      if (data && data.clients && data.status === 'scheduled') {
        await syncSingleAudit({
          id: data.id,
          clientName: data.clients.name || 'Unbekannt',
          type: data.type,
          scheduledDate: data.scheduled_date,
          certifications: data.certifications || [],
          notes: data.notes || undefined,
          clientAddress: data.clients.address || undefined,
        });
      }
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
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      logActivity({ action: 'deleted', entity_type: 'audit', entity_id: id });
    },
  });
};
