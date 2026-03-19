import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Calendar } from 'lucide-react';
import { useAudits } from '@/hooks/useAudits';
import { AUDIT_TYPE_LABELS } from '@/lib/constants';
import { AuditType } from '@/types/audit';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const AUDIT_TYPES: AuditType[] = ['initial', 'surveillance', 'recertification', 'six-month', 'internal', 'training'];

export const AuditYearStatsCard = () => {
  const { data: dbAudits = [], isLoading } = useAudits();
  const [viewMode, setViewMode] = useState<'calendar' | 'rolling'>('calendar');

  const stats = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let label: string;

    if (viewMode === 'calendar') {
      const currentYear = now.getFullYear();
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
      label = `Kalenderjahr ${currentYear}`;
    } else {
      startDate = startOfMonth(now);
      endDate = endOfMonth(addMonths(now, 11));
      label = "Kommende 12 Monate";
    }

    const filteredAudits = dbAudits.filter(audit => {
      if (audit.clients?.is_active === false) return false;
      const date = new Date(audit.scheduled_date);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });

    const total = filteredAudits.length;
    const byType: Record<string, number> = {};
    for (const type of AUDIT_TYPES) {
      byType[type] = filteredAudits.filter(a => a.type === type).length;
    }

    return { total, byType, label };
  }, [dbAudits, viewMode]);

  if (isLoading) return null;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Audits
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={viewMode} onValueChange={(val: any) => setViewMode(val)}>
              <SelectTrigger className="h-6 w-[120px] text-[10px]">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="calendar" className="text-xs">Aktuelles Jahr</SelectItem>
                <SelectItem value="rolling" className="text-xs">Rollend (12M)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground -mt-1">{stats.label}</p>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <div className="space-y-1.5 mt-2">
          {AUDIT_TYPES.map(type => (
            <div key={type} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate mr-2">{AUDIT_TYPE_LABELS[type]}</span>
              <span className="font-semibold tabular-nums">{stats.byType[type]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
