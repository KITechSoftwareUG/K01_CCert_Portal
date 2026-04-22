import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type AuditTaskDocument = Tables<'audit_task_documents'>;

export const useAuditTaskDocuments = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['audit_task_documents', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_task_documents')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AuditTaskDocument[];
    },
    enabled: !!taskId,
  });
};

export const useUploadAuditTaskDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const fileName = `${taskId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('audit-task-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('audit_task_documents')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AuditTaskDocument;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit_task_documents', variables.taskId] });
    },
  });
};

export const useDeleteAuditTaskDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, taskId }: { id: string; filePath: string; taskId: string }) => {
      const { error: storageError } = await supabase.storage
        .from('audit-task-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error } = await supabase
        .from('audit_task_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit_task_documents', variables.taskId] });
    },
  });
};

export const getAuditTaskDocumentUrl = async (filePath: string) => {
  const { data } = await supabase.storage
    .from('audit-task-documents')
    .createSignedUrl(filePath, 3600);

  return data?.signedUrl;
};
