import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CertificationDocument {
  id: string;
  client_certification_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export const useCertificationDocuments = (clientCertificationId: string | undefined) => {
  return useQuery({
    queryKey: ['certification_documents', clientCertificationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certification_documents')
        .select('*')
        .eq('client_certification_id', clientCertificationId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CertificationDocument[];
    },
    enabled: !!clientCertificationId,
  });
};

export const useUploadCertificationDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      clientCertificationId, 
      file 
    }: { 
      clientCertificationId: string; 
      file: File;
    }) => {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientCertificationId}/${Date.now()}-${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('certification-documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create document record
      const { data, error } = await supabase
        .from('certification_documents')
        .insert({
          client_certification_id: clientCertificationId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as CertificationDocument;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['certification_documents', variables.clientCertificationId] 
      });
    },
  });
};

export const useDeleteCertificationDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, filePath, clientCertificationId }: { 
      id: string; 
      filePath: string;
      clientCertificationId: string;
    }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('certification-documents')
        .remove([filePath]);
      
      if (storageError) throw storageError;
      
      // Delete record
      const { error } = await supabase
        .from('certification_documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['certification_documents', variables.clientCertificationId] 
      });
    },
  });
};

export const getDocumentUrl = async (filePath: string) => {
  const { data } = await supabase.storage
    .from('certification-documents')
    .createSignedUrl(filePath, 3600); // 1 hour expiry
  
  return data?.signedUrl;
};
