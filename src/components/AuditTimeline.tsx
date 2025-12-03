import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays, isPast, isToday, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface AuditTimelineProps {
  audits: Audit[];
}

const auditTypeLabels = {
  initial: 'Initialaudit',
  surveillance: 'Überwachungsaudit',
  recertification: 'Re-Zertifizierung',
  'six-month': '6-Monats-Überwachung',
};

export const AuditTimeline = ({ audits }: AuditTimelineProps) => {
  const navigate = useNavigate();

  const upcomingAudits = audits
    .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const getTimelineStatus = (scheduledDate: Date, audit: Audit) => {
    const days = differenceInDays(new Date(scheduledDate), new Date());
    const pendingTasks = audit.tasks.filter(t => t.status !== 'completed').length;
    const overdueTasks = audit.tasks.filter(t => 
      t.status !== 'completed' && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
    ).length;

    if (overdueTasks > 0) return 'critical';
    if (days <= 7) return 'imminent';
    if (days <= 30) return 'upcoming';
    return 'planned';
  };

  const statusConfig = {
    critical: {
      color: 'bg-destructive',
      dotColor: 'bg-destructive',
      textColor: 'text-destructive',
      label: 'Aufgaben überfällig',
    },
    imminent: {
      color: 'bg-warning',
      dotColor: 'bg-warning',
      textColor: 'text-warning',
      label: 'In < 7 Tagen',
    },
    upcoming: {
      color: 'bg-primary',
      dotColor: 'bg-primary',
      textColor: 'text-primary',
      label: 'In < 30 Tagen',
    },
    planned: {
      color: 'bg-muted-foreground',
      dotColor: 'bg-muted-foreground',
      textColor: 'text-muted-foreground',
      label: 'Geplant',
    },
  };

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
              {upcomingAudits.map((audit, index) => {
                const status = getTimelineStatus(audit.scheduledDate, audit);
                const config = statusConfig[status];
                const daysUntil = differenceInDays(new Date(audit.scheduledDate), new Date());
                const completedTasks = audit.tasks.filter(t => t.status === 'completed').length;
                const totalTasks = audit.tasks.length;
                const overdueTasks = audit.tasks.filter(t => 
                  t.status !== 'completed' && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
                ).length;

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
                      status === 'critical' ? 'border-destructive/30 bg-destructive/5' :
                      status === 'imminent' ? 'border-warning/30 bg-warning/5' :
                      'border-border bg-card'
                    )}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{audit.clientName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{auditTypeLabels[audit.type]}</span>
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
                          {overdueTasks > 0 && (
                            <span className="flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              {overdueTasks} überfällig
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {completedTasks}/{totalTasks} Aufgaben
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 w-full bg-secondary rounded-full h-1.5">
                        <div
                          className={cn('h-1.5 rounded-full transition-all', config.color)}
                          style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
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
};
