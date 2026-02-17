import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllClientCertifications } from '@/hooks/useClientCertifications';
import { UserX, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MissingAuditorsWarning = () => {
  const navigate = useNavigate();
  const { data: certifications = [], isLoading } = useAllClientCertifications();

  const missingAuditorCount = useMemo(() => {
    return certifications.filter(c => !c.auditor_id).length;
  }, [certifications]);

  if (isLoading || missingAuditorCount === 0) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-slide-up">
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
        <div className="min-w-0">
          <p className="font-semibold text-amber-700 dark:text-amber-500 text-sm sm:text-base">
            {missingAuditorCount} Zertifizierung{missingAuditorCount > 1 ? 'en' : ''} ohne Auditor
          </p>
          <p className="text-xs sm:text-sm text-amber-600/80 dark:text-amber-400/80">
            Für eine effektive Planung sollten alle aktiven Zertifizierungen einen zugewiesenen Auditor haben.
          </p>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        className="border-amber-500 text-amber-700 hover:bg-amber-500/10 shrink-0 self-end sm:self-auto"
        onClick={() => navigate('/clients')}
      >
        Ansehen
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};
