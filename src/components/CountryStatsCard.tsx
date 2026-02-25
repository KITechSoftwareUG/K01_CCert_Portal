import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';
import { useClients } from '@/hooks/useClients';

export const CountryStatsCard = () => {
  const { data: clients = [], isLoading } = useClients();

  const countryStats = useMemo(() => {
    const activeClients = clients.filter(c => c.is_active !== false);
    const countryMap: Record<string, number> = {};

    for (const client of activeClients) {
      const country = client.country || 'Sonstige';
      countryMap[country] = (countryMap[country] || 0) + 1;
    }

    // Map known countries to short codes
    const CODE_MAP: Record<string, string> = {
      'Deutschland': 'DE',
      'Österreich': 'AT',
      'Rumänien': 'RO',
      'Italien': 'IT',
      'Schweiz': 'CH',
    };

    return Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({
        country,
        code: CODE_MAP[country] || country.substring(0, 2).toUpperCase(),
        count,
      }));
  }, [clients]);

  if (isLoading) return null;

  return (
    <Card className="h-auto">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Globe className="h-4 w-4" />
          Aktive Kunden nach Land
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className="flex flex-wrap gap-3">
          {countryStats.map(({ code, count }) => (
            <div key={code} className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{code}</span>
              <span className="text-lg font-bold">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
