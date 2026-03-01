import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { logActivity } from '@/hooks/useActivityLog';

export type Contact = Tables<'contacts'>;
export type ContactInsert = TablesInsert<'contacts'>;
export type ContactUpdate = TablesUpdate<'contacts'>;

export const useContacts = (clientId?: string) => {
  return useQuery({
    queryKey: ['contacts', clientId],
    queryFn: async () => {
      let query = supabase.from('contacts').select('*');
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      const { data, error } = await query.order('is_primary', { ascending: false }).order('name');
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!clientId,
  });
};

export const useContactsByClientIds = (clientIds: string[]) => {
  return useQuery({
    queryKey: ['contacts', 'bulk', clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return {};
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .in('client_id', clientIds)
        .order('is_primary', { ascending: false })
        .order('name');
      if (error) throw error;
      
      // Group by client_id
      const grouped: Record<string, Contact[]> = {};
      (data as Contact[]).forEach(contact => {
        if (!grouped[contact.client_id]) {
          grouped[contact.client_id] = [];
        }
        grouped[contact.client_id].push(contact);
      });
      return grouped;
    },
    enabled: clientIds.length > 0,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      const { data, error } = await supabase.from('contacts').insert(contact).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      logActivity({ action: 'created', entity_type: 'contact', entity_id: data.id, entity_name: data.name });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & { id: string }) => {
      const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      logActivity({ action: 'updated', entity_type: 'contact', entity_id: data.id, entity_name: data.name });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      logActivity({ action: 'deleted', entity_type: 'contact', entity_id: id });
    },
  });
};
