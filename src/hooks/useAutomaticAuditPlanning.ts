import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, differenceInMonths, isBefore, addDays, format } from 'date-fns';

interface PlanningCertification {
  id: string;
  client_id: string;
  certification_id: string;
  status: string | null;
  valid_from: string | null;
  valid_until: string | null;
  clients: { name: string } | null;
  certifications: { name: string } | null;
}

interface PlanningAudit {
  id: string;
  client_certification_id: string | null;
  type: string;
  status: string;
  scheduled_date: string;
}

export interface SuggestedAudit {
  clientCertificationId: string;
  clientId: string;
  clientName: string;
  certificationName: string;
  certificationId: string;
  suggestedType: 'surveillance' | 'recertification';
  suggestedDate: Date;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  validUntil: Date | null;
}

const usePlanningCertifications = () => {
  const now = new Date();
  // Only active certs that haven't been expired for more than 1 month and aren't more than 36 months away
  const minDate = addMonths(now, -1).toISOString().split('T')[0];
  const maxDate = addMonths(now, 36).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['planning_certifications', minDate, maxDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_certifications')
        .select(`
          id,
          client_id,
          certification_id,
          status,
          valid_from,
          valid_until,
          clients (name),
          certifications (name)
        `)
        .eq('status', 'active')
        .gte('valid_until', minDate)
        .lte('valid_until', maxDate);

      if (error) throw error;
      return (data || []) as PlanningCertification[];
    },
  });
};

const usePlanningAudits = () => {
  const twoYearsAgo = addMonths(new Date(), -24).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['planning_audits', twoYearsAgo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select('id, client_certification_id, type, status, scheduled_date')
        .in('status', ['scheduled', 'in-progress', 'completed'])
        .gte('scheduled_date', twoYearsAgo)
        .not('client_certification_id', 'is', null);

      if (error) throw error;
      return (data || []) as PlanningAudit[];
    },
  });
};

export const useAutomaticAuditPlanning = () => {
  const { data: certifications = [], isLoading: certsLoading } = usePlanningCertifications();
  const { data: audits = [], isLoading: auditsLoading } = usePlanningAudits();

  const suggestions = useMemo(() => {
    const result: SuggestedAudit[] = [];
    const now = new Date();
    const threeMonthsAhead = addMonths(now, 3);

    for (const cert of certifications) {
      if (!cert.valid_until) continue;

      const validUntil = new Date(cert.valid_until);
      const clientName = cert.clients?.name || 'Unbekannt';
      const certificationName = cert.certifications?.name || 'Unbekannt';

      // Check if there are already scheduled audits for this certification
      const scheduledAudits = audits.filter(
        a => a.client_certification_id === cert.id &&
             (a.status === 'scheduled' || a.status === 'in-progress')
      );

      // Calculate months until expiry
      const monthsUntilExpiry = differenceInMonths(validUntil, now);

      // Recertification needed: if within 4 months of expiry and no recert scheduled
      if (monthsUntilExpiry <= 4 && monthsUntilExpiry > 0) {
        const hasRecertScheduled = scheduledAudits.some(a => a.type === 'recertification');

        if (!hasRecertScheduled) {
          const suggestedDate = addMonths(validUntil, -2);

          result.push({
            clientCertificationId: cert.id,
            clientId: cert.client_id,
            clientName,
            certificationName,
            certificationId: cert.certification_id,
            suggestedType: 'recertification',
            suggestedDate: isBefore(suggestedDate, now) ? addDays(now, 14) : suggestedDate,
            reason: `Zertifikat läuft in ${monthsUntilExpiry} Monat${monthsUntilExpiry !== 1 ? 'en' : ''} ab`,
            priority: monthsUntilExpiry <= 2 ? 'high' : 'medium',
            validUntil,
          });
        }
      }

      // Check for surveillance audits (typically yearly)
      const completedAudits = audits
        .filter(a => a.client_certification_id === cert.id && a.status === 'completed')
        .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());

      const hasSurveillanceScheduled = scheduledAudits.some(a => a.type === 'surveillance');

      if (completedAudits.length > 0) {
        const lastAuditDate = new Date(completedAudits[0].scheduled_date);
        const monthsSinceLastAudit = differenceInMonths(now, lastAuditDate);

        if (monthsSinceLastAudit >= 10 && monthsUntilExpiry > 4 && !hasSurveillanceScheduled) {
          const suggestedDate = addMonths(lastAuditDate, 12);

          result.push({
            clientCertificationId: cert.id,
            clientId: cert.client_id,
            clientName,
            certificationName,
            certificationId: cert.certification_id,
            suggestedType: 'surveillance',
            suggestedDate: isBefore(suggestedDate, now) ? addDays(now, 14) : suggestedDate,
            reason: `Letztes Audit vor ${monthsSinceLastAudit} Monaten`,
            priority: monthsSinceLastAudit >= 12 ? 'high' : 'medium',
            validUntil,
          });
        }
      } else if (cert.valid_from && !hasSurveillanceScheduled && monthsUntilExpiry > 4) {
        const validFrom = new Date(cert.valid_from);
        const suggestedDate = addMonths(validFrom, 12);
        const monthsSinceValidFrom = differenceInMonths(now, validFrom);

        if (monthsSinceValidFrom >= 10 || isBefore(suggestedDate, threeMonthsAhead)) {
          result.push({
            clientCertificationId: cert.id,
            clientId: cert.client_id,
            clientName,
            certificationName,
            certificationId: cert.certification_id,
            suggestedType: 'surveillance',
            suggestedDate: isBefore(suggestedDate, now) ? addDays(now, 14) : suggestedDate,
            reason: `Zertifikat gültig seit ${format(validFrom, 'dd.MM.yyyy')} – noch kein Audit`,
            priority: monthsSinceValidFrom >= 12 ? 'high' : 'medium',
            validUntil,
          });
        }
      }
    }

    // Sort by priority and date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.suggestedDate.getTime() - b.suggestedDate.getTime();
    });
  }, [certifications, audits]);

  return {
    suggestions,
    isLoading: certsLoading || auditsLoading,
    highPriorityCount: suggestions.filter(s => s.priority === 'high').length,
    totalCount: suggestions.length,
  };
};
