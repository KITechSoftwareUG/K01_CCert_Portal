import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type DbCertification = Tables<'certifications'>;

export const useCertifications = () => {
  return useQuery({
    queryKey: ['certifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as DbCertification[];
    },
  });
};
