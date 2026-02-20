import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldAlert, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { useAllClientCertifications } from '@/hooks/useClientCertifications';
import { differenceInDays, isPast, isToday, format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ExpiringCertification {
  id: string;
  clientName: string;
  clientId: string;
  certificationName: string;
  validUntil: Date;
  daysUntilExpiry: number;
  status: 'expired' | 'critical' | 'warning' | 'ok';
}

export const ExpiringCertificationsCard = () => {
  const navigate = useNavigate();
  const { data: certifications = [], isLoading } = useAllClientCertifications();

  const expiringCertifications = useMemo(() => {
    const result: ExpiringCertification[] = [];

    for (const cert of certifications) {
      if (!cert.valid_until) continue;

      const validUntil = new Date(cert.valid_until);
      const daysUntilExpiry = differenceInDays(validUntil, new Date());

      if (daysUntilExpiry > 90) continue;

      let status: ExpiringCertification['status'] = 'ok';
      if (isPast(validUntil) && !isToday(validUntil)) {
        status = 'expired';
      } else if (daysUntilExpiry <= 14) {
        status = 'critical';
      } else if (daysUntilExpiry <= 30) {
        status = 'warning';
      }

      result.push({
        id: cert.id,
        clientName: (cert as any).clients?.name || 'Unbekannt',
        clientId: cert.client_id,
        certificationName: cert.certifications?.name || 'Unbekannt',
        validUntil,
        daysUntilExpiry,
        status,
      });
    }

    return result.sort((a, b) => {
      if (a.status === 'expired' && b.status !== 'expired') return -1;
      if (b.status === 'expired' && a.status !== 'expired') return 1;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
  }, [certifications]);

  const stats = useMemo(() => ({
    expired: expiringCertifications.filter(c => c.status === 'expired').length,
    critical: expiringCertifications.filter(c => c.status === 'critical').length,
    warning: expiringCertifications.filter(c => c.status === 'warning').length,
    ok: expiringCertifications.filter(c => c.status === 'ok').length,
  }), [expiringCertifications]);

  const getDaysLabel = (days: number, status: ExpiringCertification['status']) => {
    if (status === 'expired') return 'Abgelaufen';
    if (days === 0) return 'Heute';
    if (days === 1) return '1 Tag';
    return `${days} Tage`;
  };

  const getStatusColor = (status: ExpiringCertification['status']) => {
    switch (status) {
      case 'expired': return 'bg-destructive text-destructive-foreground';
      case 'critical': return 'bg-destructive/80 text-destructive-foreground';
      case 'warning': return 'bg-amber-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRowAccent = (status: ExpiringCertification['status']) => {
    switch (status) {
      case 'expired': return 'border-l-destructive';
      case 'critical': return 'border-l-destructive/70';
      case 'warning': return 'border-l-amber-500';
      default: return 'border-l-muted-foreground/30';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Ablaufende Zertifikate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Laden...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          Ablaufende Zertifikate
        </CardTitle>
        {/* Summary pills */}
        {expiringCertifications.length > 0 && (
          <div className="flex gap-3 mt-2">
            {stats.expired > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="h-3 w-3" />
                {stats.expired} abgelaufen
              </div>
            )}
            {stats.critical > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-destructive/80">
                <Clock className="h-3 w-3" />
                {stats.critical} kritisch
              </div>
            )}
            {stats.warning > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                {stats.warning} bald
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-1">
        {expiringCertifications.length === 0 ? (
          <div className="text-center py-8">
            <ShieldCheck className="h-10 w-10 mx-auto text-success/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Alles im grünen Bereich – keine Zertifikate laufen in den nächsten 90 Tagen ab.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[340px] -mx-1 px-1">
            <div className="space-y-1">
              {expiringCertifications.map((cert) => (
                <div
                  key={cert.id}
                  className={`group flex items-center gap-3 p-2.5 rounded-md border-l-[3px] cursor-pointer transition-all hover:bg-muted/50 ${getRowAccent(cert.status)}`}
                  onClick={() => navigate(`/certifications/${cert.id}`)}
                >
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {cert.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {cert.certificationName} · bis {format(cert.validUntil, 'dd.MM.yyyy')}
                    </p>
                  </div>

                  {/* Days badge */}
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(cert.status)}`}>
                    {getDaysLabel(cert.daysUntilExpiry, cert.status)}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};