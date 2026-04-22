import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type AuditSequence = Tables<'certification_audit_sequences'>;
export type AuditSequenceInsert = TablesInsert<'certification_audit_sequences'>;
export type AuditSequenceUpdate = TablesUpdate<'certification_audit_sequences'>;

const QUERY_KEY = (certificationId: string) => ['audit_sequences', certificationId];

export const useCertificationAuditSequences = (certificationId: string) => {
  return useQuery({
    queryKey: QUERY_KEY(certificationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certification_audit_sequences')
        .select('*')
        .eq('certification_id', certificationId)
        .order('sequence_order', { ascending: true });
      if (error) throw error;
      return data as AuditSequence[];
    },
    enabled: !!certificationId,
  });
};

export const useUpsertAuditSequences = (certificationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sequences: AuditSequenceInsert[]) => {
      // Alle bestehenden Schritte löschen, dann neu einfügen (einfachste Strategie für einen Editor)
      const { error: deleteError } = await supabase
        .from('certification_audit_sequences')
        .delete()
        .eq('certification_id', certificationId);
      if (deleteError) throw deleteError;

      if (sequences.length === 0) return;

      const { error: insertError } = await supabase
        .from('certification_audit_sequences')
        .insert(sequences);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(certificationId) });
    },
  });
};
