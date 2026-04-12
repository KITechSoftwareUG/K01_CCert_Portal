import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditDocument {
  id: string;
  audit_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export const useAuditDocuments = (auditId: string | undefined) => {
  return useQuery({
    queryKey: ['audit_documents', auditId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_documents')
        .select('*')
        .eq('audit_id', auditId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AuditDocument[];
    },
    enabled: !!auditId,
  });
};

export const useUploadAuditDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ auditId, file }: { auditId: string; file: File }) => {
      const fileName = `${auditId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('audit-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('audit_documents')
        .insert({
          audit_id: auditId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AuditDocument;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit_documents', variables.auditId] });
    },
  });
};

export const useDeleteAuditDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, auditId }: { id: string; filePath: string; auditId: string }) => {
      const { error: storageError } = await supabase.storage
        .from('audit-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error } = await supabase
        .from('audit_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit_documents', variables.auditId] });
    },
  });
};

export const getAuditDocumentUrl = async (filePath: string) => {
  const { data } = await supabase.storage
    .from('audit-documents')
    .createSignedUrl(filePath, 3600);

  return data?.signedUrl;
};
