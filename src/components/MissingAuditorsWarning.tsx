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
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3 animate-slide-up">
      <UserX className="h-6 w-6 text-amber-600 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-amber-700 dark:text-amber-500">
          {missingAuditorCount} Zertifizierung{missingAuditorCount > 1 ? 'en' : ''} ohne Auditor
        </p>
        <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
          Für eine effektive Planung sollten alle aktiven Zertifizierungen einen zugewiesenen Auditor haben.
        </p>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        className="border-amber-500 text-amber-700 hover:bg-amber-500/10 shrink-0"
        onClick={() => navigate('/clients')}
      >
        Ansehen
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};
