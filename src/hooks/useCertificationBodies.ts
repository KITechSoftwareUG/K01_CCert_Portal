import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CertificationBody {
  id: string;
  name: string;
  short_name: string | null;
  website: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export const useCertificationBodies = () => {
  return useQuery({
    queryKey: ['certification_bodies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certification_bodies')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as CertificationBody[];
    },
  });
};

export const useCreateCertificationBody = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (body: { 
      name: string; 
      short_name?: string; 
      website?: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      address?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('certification_bodies')
        .insert(body)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certification_bodies'] });
    },
  });
};

export const useUpdateCertificationBody = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...body }: { 
      id: string;
      name?: string; 
      short_name?: string; 
      website?: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      address?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('certification_bodies')
        .update(body)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certification_bodies'] });
    },
  });
};

export const useDeleteCertificationBody = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('certification_bodies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certification_bodies'] });
      queryClient.invalidateQueries({ queryKey: ['client_certification_bodies'] });
    },
  });
};

export const useClientCertificationBodies = (clientId?: string) => {
  return useQuery({
    queryKey: ['client_certification_bodies', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certification_bodies')
        .select(`
          id,
          certification_body_id,
          certification_bodies (*)
        `)
        .eq('client_id', clientId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
};

export const useUpdateClientCertificationBodies = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      clientId, 
      certificationBodyIds 
    }: { 
      clientId: string; 
      certificationBodyIds: string[] 
    }) => {
      // First, delete all existing relationships
      const { error: deleteError } = await supabase
        .from('client_certification_bodies')
        .delete()
        .eq('client_id', clientId);
      
      if (deleteError) throw deleteError;

      // Then, insert new relationships
      if (certificationBodyIds.length > 0) {
        const { error: insertError } = await supabase
          .from('client_certification_bodies')
          .insert(
            certificationBodyIds.map(bodyId => ({
              client_id: clientId,
              certification_body_id: bodyId,
            }))
          );
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client_certification_bodies', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};
