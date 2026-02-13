import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Calendar, ChevronRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAllClientCertifications } from '@/hooks/useClientCertifications';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
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
  }), [expiringCertifications]);

  const formatValidUntil = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = format(date, 'MMM', { locale: de });
    const year = date.getFullYear();
    return `${day}. ${month} ${year}`;
  };

  const getStatusIndicator = (status: ExpiringCertification['status'], days: number) => {
    switch (status) {
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            Abgelaufen
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            {days} Tag{days !== 1 ? 'e' : ''}
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {days} Tage
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            {days} Tage
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
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
    <Card className="border-amber-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Ablaufende Zertifikate
          </div>
          <div className="flex gap-1.5">
            {stats.expired > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {stats.expired}
              </Badge>
            )}
            {stats.critical > 0 && (
              <Badge className="bg-destructive/70 text-[10px] px-1.5 py-0">
                {stats.critical}
              </Badge>
            )}
            {stats.warning > 0 && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-[10px] px-1.5 py-0">
                {stats.warning}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {expiringCertifications.length === 0 ? (
          <div className="text-center py-6">
            <ShieldCheck className="h-10 w-10 mx-auto text-success/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Keine Zertifikate laufen in den nächsten 90 Tagen ab
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-3">
            <div className="space-y-1.5">
              {expiringCertifications.map((cert) => (
                <div
                  key={cert.id}
                  className={`group/item flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-muted/60 ${
                    cert.status === 'expired' 
                      ? 'bg-destructive/[0.04]' 
                      : cert.status === 'critical'
                      ? 'bg-destructive/[0.03]'
                      : ''
                  }`}
                  onClick={() => navigate(`/certifications/${cert.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">
                        {cert.certificationName}
                      </span>
                      {getStatusIndicator(cert.status, cert.daysUntilExpiry)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">{cert.clientName}</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="shrink-0">{formatValidUntil(cert.validUntil)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/item:text-muted-foreground transition-colors shrink-0" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
