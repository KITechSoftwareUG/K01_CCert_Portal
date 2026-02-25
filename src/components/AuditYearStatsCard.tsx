import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { useAudits } from '@/hooks/useAudits';
import { AUDIT_TYPE_LABELS } from '@/lib/constants';
import { AuditType } from '@/types/audit';

const AUDIT_TYPES: AuditType[] = ['initial', 'surveillance', 'recertification', 'six-month', 'internal'];

export const AuditYearStatsCard = () => {
  const { data: dbAudits = [], isLoading } = useAudits();

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearAudits = dbAudits.filter(audit => {
      if (audit.clients?.is_active === false) return false;
      const date = new Date(audit.scheduled_date);
      return date.getFullYear() === currentYear;
    });

    const total = yearAudits.length;
    const byType: Record<string, number> = {};
    for (const type of AUDIT_TYPES) {
      byType[type] = yearAudits.filter(a => a.type === type).length;
    }

    return { total, byType, year: currentYear };
  }, [dbAudits]);

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Audit-Statistik {stats.year}
          </div>
          <span className="text-2xl font-bold">{stats.total}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {AUDIT_TYPES.map(type => (
            <div key={type} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{AUDIT_TYPE_LABELS[type]}</span>
              <span className="font-semibold tabular-nums">{stats.byType[type]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
