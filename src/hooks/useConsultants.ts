import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbConsultant = Tables<'consultants'>;
export type DbConsultantInsert = TablesInsert<'consultants'>;
export type DbConsultantUpdate = TablesUpdate<'consultants'>;

// Get all consultants
export const useConsultants = () => {
    return useQuery({
        queryKey: ['consultants'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('consultants')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data as DbConsultant[];
        },
    });
};

// Get a single consultant
export const useConsultant = (id: string | undefined) => {
    return useQuery({
        queryKey: ['consultants', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('consultants')
                .select('*')
                .eq('id', id!)
                .maybeSingle();

            if (error) throw error;
            return data as DbConsultant | null;
        },
        enabled: !!id,
    });
};

// Create a consultant
export const useCreateConsultant = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (consultant: DbConsultantInsert) => {
            const { data, error } = await supabase
                .from('consultants')
                .insert(consultant)
                .select()
                .single();

            if (error) throw error;
            return data as DbConsultant;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consultants'] });
        },
    });
};

// Update a consultant
export const useUpdateConsultant = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: DbConsultantUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from('consultants')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as DbConsultant;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consultants'] });
        },
    });
};

// Delete a consultant
export const useDeleteConsultant = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('consultants')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consultants'] });
        },
    });
};
