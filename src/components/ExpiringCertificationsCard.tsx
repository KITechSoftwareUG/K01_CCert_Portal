import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      
      // Only show certs expiring within 90 days or already expired
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

    // Sort by urgency (expired first, then by days until expiry)
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
    // Ensure the year is displayed correctly (fix for dates showing wrong century)
    const day = date.getDate().toString().padStart(2, '0');
    const month = format(date, 'MMM', { locale: de });
    const year = date.getFullYear();
    return `${day}. ${month} ${year}`;
  };

  const getStatusBadge = (status: ExpiringCertification['status'], days: number) => {
    switch (status) {
      case 'expired':
        return (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            Abgelaufen
          </Badge>
        );
      case 'critical':
        return (
          <Badge className="bg-destructive/80 hover:bg-destructive/90 gap-1">
            <AlertTriangle className="h-3 w-3" />
            {days} Tag{days !== 1 ? 'e' : ''}
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
            <Calendar className="h-3 w-3" />
            {days} Tage
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {days} Tage
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Ablaufende Zertifikate
          </div>
          {(stats.expired > 0 || stats.critical > 0) && (
            <div className="flex gap-2">
              {stats.expired > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.expired} abgelaufen
                </Badge>
              )}
              {stats.critical > 0 && (
                <Badge className="bg-destructive/80 text-xs">
                  {stats.critical} kritisch
                </Badge>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {expiringCertifications.length === 0 ? (
          <div className="text-center py-8">
            <ShieldCheck className="h-12 w-12 mx-auto text-success mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Keine Zertifikate laufen in den nächsten 90 Tagen ab
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[260px] pr-4">
            <div className="space-y-3">
              {expiringCertifications.map((cert) => (
                <div
                  key={cert.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                    cert.status === 'expired' 
                      ? 'border-destructive/50 bg-destructive/5' 
                      : cert.status === 'critical'
                      ? 'border-destructive/30 bg-destructive/5'
                      : cert.status === 'warning'
                      ? 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-border'
                  }`}
                  onClick={() => navigate(`/certifications/${cert.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {cert.certificationName}
                        </span>
                        {getStatusBadge(cert.status, cert.daysUntilExpiry)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {cert.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gültig bis: {formatValidUntil(cert.validUntil)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/certifications/${cert.id}`);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
