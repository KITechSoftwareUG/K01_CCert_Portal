import { memo, useMemo } from 'react';
import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { AUDIT_TYPE_LABELS, TIMELINE_STATUS_CONFIG } from '@/lib/constants';
import { getActiveAudits, sortAuditsByDate, calculateProgress, getOverdueTasks } from '@/lib/auditUtils';
import { getDaysUntil, getTimelineStatus } from '@/lib/dateUtils';

interface AuditTimelineProps {
  audits: Audit[];
}

export const AuditTimeline = memo(({ audits }: AuditTimelineProps) => {
  const navigate = useNavigate();

  const upcomingAudits = useMemo(
    () => sortAuditsByDate(getActiveAudits(audits)),
    [audits]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Audit-Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingAudits.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Keine geplanten Audits</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {upcomingAudits.map((audit) => {
                const overdueTasks = getOverdueTasks(audit.tasks);
                const status = getTimelineStatus(audit.scheduledDate, overdueTasks.length > 0);
                const config = TIMELINE_STATUS_CONFIG[status];
                const daysUntil = getDaysUntil(audit.scheduledDate);
                const { completed, total, percentage } = calculateProgress(audit.tasks);

                return (
                  <div
                    key={audit.id}
                    onClick={() => navigate(`/audits/${audit.id}`)}
                    className="relative pl-8 cursor-pointer group"
                  >
                    {/* Timeline dot */}
                    <div className={cn(
                      'absolute left-1.5 top-2 w-3 h-3 rounded-full border-2 border-background',
                      config.dotColor
                    )} />

                    <div className={cn(
                      'p-4 rounded-lg border transition-all group-hover:shadow-md',
                      config.borderClass
                    )}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{audit.clientName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{AUDIT_TYPE_LABELS[audit.type]}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn('text-xs', config.textColor)}>
                          {config.label}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className={cn('font-medium', config.textColor)}>
                          {format(audit.scheduledDate, 'dd. MMMM yyyy', { locale: de })}
                          {daysUntil >= 0 && ` (in ${daysUntil} Tagen)`}
                        </span>
                        <div className="flex items-center gap-2">
                          {overdueTasks.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              {overdueTasks.length} überfällig
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {completed}/{total} Aufgaben
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 w-full bg-secondary rounded-full h-1.5">
                        <div
                          className={cn('h-1.5 rounded-full transition-all duration-300', config.color)}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AuditTimeline.displayName = 'AuditTimeline';
