import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditorByClientCertification {
  clientCertificationId: string;
  auditorId: string;
  auditorName: string;
  auditorEmail: string | null;
  auditorPhone: string | null;
}

interface ClientCertificationWithAuditor {
  id: string;
  auditor_id: string | null;
  auditors: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

// Fetches auditors directly linked to client certifications via auditor_id
export const useAuditorsForCertifications = () => {
  return useQuery({
    queryKey: ['auditors-for-certifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certifications')
        .select(`
          id,
          auditor_id,
          auditors (
            id,
            name,
            email,
            phone
          )
        `)
        .not('auditor_id', 'is', null);
      
      if (error) throw error;
      
      // Create a map of client_certification_id -> auditor info
      const auditorMap: Record<string, AuditorByClientCertification> = {};
      
      (data as ClientCertificationWithAuditor[] | null)?.forEach((cc) => {
        if (cc.id && cc.auditors) {
          auditorMap[cc.id] = {
            clientCertificationId: cc.id,
            auditorId: cc.auditors.id,
            auditorName: cc.auditors.name,
            auditorEmail: cc.auditors.email,
            auditorPhone: cc.auditors.phone,
          };
        }
      });
      
      return auditorMap;
    },
  });
};
