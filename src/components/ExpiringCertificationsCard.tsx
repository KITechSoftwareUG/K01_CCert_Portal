import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
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

  const getStatusBadge = (status: ExpiringCertification['status'], days: number) => {
    switch (status) {
      case 'expired':
        return (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-semibold">
            Abgelaufen
          </Badge>
        );
      case 'critical':
        return (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-destructive/80">
            {days} Tag{days !== 1 ? 'e' : ''}
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600 dark:text-amber-400">
            {days} Tage
          </Badge>
        );
      default:
        return (
          <span className="text-xs text-muted-foreground">
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
          <ScrollArea className="h-[320px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs h-8">Kunde</TableHead>
                  <TableHead className="text-xs h-8">Zertifikat</TableHead>
                  <TableHead className="text-xs h-8">Gültig bis</TableHead>
                  <TableHead className="text-xs h-8 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringCertifications.map((cert) => (
                  <TableRow
                    key={cert.id}
                    className={`cursor-pointer text-xs ${
                      cert.status === 'expired' 
                        ? 'bg-destructive/[0.04]' 
                        : cert.status === 'critical'
                        ? 'bg-destructive/[0.03]'
                        : ''
                    }`}
                    onClick={() => navigate(`/certifications/${cert.id}`)}
                  >
                    <TableCell className="py-2 font-medium truncate max-w-[120px]">
                      {cert.clientName}
                    </TableCell>
                    <TableCell className="py-2 truncate max-w-[100px] text-muted-foreground">
                      {cert.certificationName}
                    </TableCell>
                    <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                      {formatValidUntil(cert.validUntil)}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      {getStatusBadge(cert.status, cert.daysUntilExpiry)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
