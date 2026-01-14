import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditorByClientCertification {
  clientCertificationId: string;
  auditorId: string;
  auditorName: string;
  auditorEmail: string | null;
  auditorPhone: string | null;
}

// Fetches auditors for all client certifications based on their audits
export const useAuditorsForCertifications = () => {
  return useQuery({
    queryKey: ['auditors-for-certifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          client_certification_id,
          auditor_id,
          auditors (
            id,
            name,
            email,
            phone
          )
        `)
        .not('client_certification_id', 'is', null)
        .not('auditor_id', 'is', null)
        .order('scheduled_date', { ascending: false });
      
      if (error) throw error;
      
      // Create a map of client_certification_id -> auditor info (take the most recent audit's auditor)
      const auditorMap: Record<string, AuditorByClientCertification> = {};
      
      data?.forEach((audit: any) => {
        if (audit.client_certification_id && audit.auditors && !auditorMap[audit.client_certification_id]) {
          auditorMap[audit.client_certification_id] = {
            clientCertificationId: audit.client_certification_id,
            auditorId: audit.auditors.id,
            auditorName: audit.auditors.name,
            auditorEmail: audit.auditors.email,
            auditorPhone: audit.auditors.phone,
          };
        }
      });
      
      return auditorMap;
    },
  });
};
