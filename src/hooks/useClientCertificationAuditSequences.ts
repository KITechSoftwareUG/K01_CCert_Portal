import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type ClientAuditSequence = Tables<'client_certification_audit_sequences'>;
export type ClientAuditSequenceInsert = TablesInsert<'client_certification_audit_sequences'>;

const QUERY_KEY = (clientCertificationId: string) => ['client_cert_audit_sequences', clientCertificationId];

export const useClientCertificationAuditSequences = (clientCertificationId: string) => {
  return useQuery({
    queryKey: QUERY_KEY(clientCertificationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certification_audit_sequences')
        .select('*')
        .eq('client_certification_id', clientCertificationId)
        .order('sequence_order', { ascending: true });
      if (error) throw error;
      return data as ClientAuditSequence[];
    },
    enabled: !!clientCertificationId,
  });
};

export const useUpsertClientCertificationAuditSequences = (clientCertificationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sequences: ClientAuditSequenceInsert[]) => {
      const { error: deleteError } = await supabase
        .from('client_certification_audit_sequences')
        .delete()
        .eq('client_certification_id', clientCertificationId);
      if (deleteError) throw deleteError;

      if (sequences.length === 0) return;

      const { error: insertError } = await supabase
        .from('client_certification_audit_sequences')
        .insert(sequences);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(clientCertificationId) });
    },
  });
};

export const useDeleteClientCertificationAuditSequences = (clientCertificationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('client_certification_audit_sequences')
        .delete()
        .eq('client_certification_id', clientCertificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(clientCertificationId) });
    },
  });
};
