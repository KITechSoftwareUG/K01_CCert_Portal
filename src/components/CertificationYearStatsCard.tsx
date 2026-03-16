import { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAllClientCertifications } from '@/hooks/useClientCertifications';

interface CertificationYearStat {
  name: string;
  count: number;
}

export const CertificationYearStatsCard = () => {
  const { data: certifications = [], isLoading } = useAllClientCertifications();

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const yearCertifications = certifications.filter((cert) => {
      if ((cert as any).clients?.is_active === false) return false;

      const validFrom = cert.valid_from ? new Date(cert.valid_from) : new Date(cert.created_at);
      const validUntil = cert.valid_until ? new Date(cert.valid_until) : null;

      return validFrom <= yearEnd && (validUntil === null || validUntil >= yearStart);
    });

    const byType = yearCertifications.reduce<Record<string, number>>((acc, cert) => {
      const certificationName = cert.certifications?.name || 'Unbekannt';
      acc[certificationName] = (acc[certificationName] || 0) + 1;
      return acc;
    }, {});

    const sortedTypes: CertificationYearStat[] = Object.entries(byType)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
      .map(([name, count]) => ({ name, count }));

    return {
      total: yearCertifications.length,
      year: currentYear,
      types: sortedTypes,
    };
  }, [certifications]);

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Zertifizierungs-Statistik {stats.year}
          </div>
          <span className="text-2xl font-bold">{stats.total}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {stats.types.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Zertifizierungen im ausgewählten Jahr</div>
          ) : (
            stats.types.map((type) => (
              <div key={type.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">{type.name}</span>
                <span className="font-semibold tabular-nums">{type.count}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
