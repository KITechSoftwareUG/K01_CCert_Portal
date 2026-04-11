import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { logActivity } from '@/hooks/useActivityLog';

export type DbClientCertification = Tables<'client_certifications'>;
export type DbClientCertificationInsert = TablesInsert<'client_certifications'>;
export type DbClientCertificationUpdate = TablesUpdate<'client_certifications'>;

export type ClientCertificationWithDetails = DbClientCertification & {
  certifications: Tables<'certifications'> | null;
  certification_bodies: Tables<'certification_bodies'> | null;
};

// Get all client certifications for a specific client
export const useClientCertifications = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ['client_certifications', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certifications')
        .select(`
          *,
          certifications (*),
          certification_bodies (*)
        `)
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientCertificationWithDetails[];
    },
    enabled: !!clientId,
  });
};

// Get a single client certification
export const useClientCertification = (id: string | undefined) => {
  return useQuery({
    queryKey: ['client_certifications', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certifications')
        .select(`
          *,
          certifications (*)
        `)
        .eq('id', id!)
        .maybeSingle();
      
      if (error) throw error;
      return data as ClientCertificationWithDetails | null;
    },
    enabled: !!id,
  });
};

// Get all client certifications with client details (for lists)
export const useAllClientCertifications = () => {
  return useQuery({
    queryKey: ['client_certifications', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certifications')
        .select(`
          *,
          certifications (*),
          certification_bodies (*),
          clients (*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// Create a client certification
export const useCreateClientCertification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (certification: DbClientCertificationInsert) => {
      const { data, error } = await supabase
        .from('client_certifications')
        .insert(certification)
        .select(`
          *,
          certifications (*)
        `)
        .single();
      
      if (error) throw error;
      return data as ClientCertificationWithDetails;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client_certifications'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.client_id] });
      logActivity({ action: 'created', entity_type: 'client_certification', entity_id: data.id, entity_name: data.certifications?.name });
    },
  });
};

// Update a client certification
export const useUpdateClientCertification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: DbClientCertificationUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('client_certifications')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          certifications (*)
        `)
        .single();
      
      if (error) throw error;
      return data as ClientCertificationWithDetails;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client_certifications'] });
      logActivity({ action: 'updated', entity_type: 'client_certification', entity_id: data.id, entity_name: data.certifications?.name });
    },
  });
};

// Delete a client certification
export const useDeleteClientCertification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_certifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['client_certifications'] });
      logActivity({ action: 'deleted', entity_type: 'client_certification', entity_id: id });
    },
  });
};

// Sync client certifications from legacy certifications array
export const useSyncClientCertifications = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, certificationIds }: { clientId: string; certificationIds: string[] }) => {
      // First delete existing client certifications
      const { error: deleteError } = await supabase
        .from('client_certifications')
        .delete()
        .eq('client_id', clientId);
      
      if (deleteError) throw deleteError;
      
      // Then insert new ones
      if (certificationIds.length > 0) {
        const { error: insertError } = await supabase
          .from('client_certifications')
          .insert(
            certificationIds.map(certId => ({
              client_id: clientId,
              certification_id: certId,
            }))
          );
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client_certifications', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};
