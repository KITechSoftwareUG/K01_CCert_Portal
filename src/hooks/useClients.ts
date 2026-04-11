import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';
import { calculateNextClientNumber } from '@/lib/clientNumberUtils';
import { logActivity } from '@/hooks/useActivityLog';

export type DbClient = Tables<'clients'>;
export type DbClientInsert = TablesInsert<'clients'>;
export type CertificationStandard = Enums<'certification_standard'>;

export type ClientWithChildren = DbClient & {
  children?: DbClient[];
  parent?: DbClient | null;
};

export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as DbClient[];
    },
  });
};

// Get only parent companies (those without a parent_client_id)
export const useParentClients = () => {
  return useQuery({
    queryKey: ['clients', 'parents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('parent_client_id', null)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as DbClient[];
    },
  });
};

// Get children of a specific parent
export const useChildClients = (parentId: string | undefined) => {
  return useQuery({
    queryKey: ['clients', 'children', parentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('parent_client_id', parentId!)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as DbClient[];
    },
    enabled: !!parentId,
  });
};

export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as DbClient | null;
    },
    enabled: !!id,
  });
};

// Helper function to generate the next client number for a country
export const getNextClientNumberForCountry = async (country: string): Promise<string> => {
  // Get all existing client numbers
  const { data: clients, error } = await supabase
    .from('clients')
    .select('client_number')
    .not('client_number', 'is', null);
  
  if (error) throw error;
  
  const existingNumbers = clients?.map(c => c.client_number) || [];
  return calculateNextClientNumber(country, existingNumbers);
};

// Legacy function for child numbering (kept for backwards compatibility)
export const getNextClientNumber = async (parentId: string): Promise<string> => {
  const { data: siblings, error } = await supabase
    .from('clients')
    .select('client_number')
    .eq('parent_client_id', parentId);
  
  if (error) throw error;
  
  // Find the highest number among siblings
  let maxNum = 0;
  siblings?.forEach(s => {
    if (s.client_number) {
      const num = parseInt(s.client_number, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  
  // Return next number padded to 2 digits
  return String(maxNum + 1).padStart(2, '0');
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (client: DbClientInsert) => {
      // Client number is now manually provided - no auto-generation
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      logActivity({ action: 'created', entity_type: 'client', entity_id: data.id, entity_name: data.name });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbClient> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      logActivity({ action: 'updated', entity_type: 'client', entity_id: data.id, entity_name: data.name });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        // Postgres FK-Verletzung (23503): RESTRICT greift — Client hat noch verknüpfte Daten
        if (error.code === '23503') {
          throw new Error(
            'Dieser Kunde kann nicht gelöscht werden, da noch Audits oder Zertifizierungen verknüpft sind. ' +
            'Bitte zuerst alle Audits und Zertifizierungen des Kunden entfernen.'
          );
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      logActivity({ action: 'deleted', entity_type: 'client', entity_id: id });
    },
  });
};

// Bulk create clients (for Excel import)
export const useBulkCreateClients = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clients: DbClientInsert[]) => {
      const results = [];
      for (const client of clients) {
        // Auto-generate client_number if parent is selected
        let clientNumber = client.client_number;
        if (client.parent_client_id && !clientNumber) {
          clientNumber = await getNextClientNumber(client.parent_client_id);
        }
        
        const { data, error } = await supabase
          .from('clients')
          .insert({ ...client, client_number: clientNumber })
          .select()
          .single();
        
        if (error) throw error;
        results.push(data);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};
