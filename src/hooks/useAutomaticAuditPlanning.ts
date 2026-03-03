import { useMemo } from 'react';
import { useAllClientCertifications } from './useClientCertifications';
import { useAudits } from './useAudits';
import { addMonths, differenceInMonths, isBefore, isAfter, addDays, format } from 'date-fns';

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

export const useAutomaticAuditPlanning = () => {
  const { data: certifications = [], isLoading: certsLoading } = useAllClientCertifications();
  const { data: audits = [], isLoading: auditsLoading } = useAudits();

  const suggestions = useMemo(() => {
    const result: SuggestedAudit[] = [];
    const now = new Date();
    const threeMonthsAhead = addMonths(now, 3);

    for (const cert of certifications) {
      if (!cert.valid_until) continue;

      const validUntil = new Date(cert.valid_until);
      const clientName = (cert as any).clients?.name || 'Unbekannt';
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
          // Suggest recertification 2 months before expiry
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
      // Find the last completed or scheduled audit
      const completedAudits = audits
        .filter(a => a.client_certification_id === cert.id && a.status === 'completed')
        .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());

      const allRelevantAudits = audits
        .filter(a => a.client_certification_id === cert.id && (a.status === 'completed' || a.status === 'scheduled' || a.status === 'in-progress'))
        .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());

      const hasSurveillanceScheduled = scheduledAudits.some(a => a.type === 'surveillance');

      if (completedAudits.length > 0) {
        const lastAuditDate = new Date(completedAudits[0].scheduled_date);
        const monthsSinceLastAudit = differenceInMonths(now, lastAuditDate);

        // If more than 10 months since last audit and no surveillance scheduled
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
        // No audits at all but certification has valid_from → suggest surveillance 12 months after valid_from
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
