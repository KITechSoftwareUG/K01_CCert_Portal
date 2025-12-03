import { Audit, AuditTask } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface TaskWithAudit extends AuditTask {
  auditId: string;
  clientName: string;
  auditType: string;
}

interface UpcomingTasksCardProps {
  audits: Audit[];
  maxTasks?: number;
}

const auditTypeLabels = {
  initial: 'Initialaudit',
  surveillance: 'Überwachungsaudit',
  recertification: 'Re-Zertifizierung',
  'six-month': '6-Monats-Überwachung',
};

export const UpcomingTasksCard = ({ audits, maxTasks = 8 }: UpcomingTasksCardProps) => {
  const navigate = useNavigate();

  // Collect all pending tasks from all audits
  const allTasks: TaskWithAudit[] = audits
    .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
    .flatMap(audit => 
      audit.tasks
        .filter(t => t.status !== 'completed')
        .map(task => ({
          ...task,
          auditId: audit.id,
          clientName: audit.clientName,
          auditType: auditTypeLabels[audit.type],
        }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, maxTasks);

  const getUrgencyLevel = (dueDate: Date) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
    if (days <= 3) return 'critical';
    if (days <= 7) return 'warning';
    return 'normal';
  };

  const urgencyConfig = {
    overdue: { 
      bg: 'bg-destructive/10 border-destructive/30', 
      text: 'text-destructive',
      icon: AlertTriangle,
      badge: 'Überfällig'
    },
    critical: { 
      bg: 'bg-warning/10 border-warning/30', 
      text: 'text-warning',
      icon: Clock,
      badge: 'Dringend'
    },
    warning: { 
      bg: 'bg-accent/10 border-accent/30', 
      text: 'text-accent-foreground',
      icon: Clock,
      badge: 'Diese Woche'
    },
    normal: { 
      bg: 'bg-card border-border', 
      text: 'text-muted-foreground',
      icon: CheckCircle2,
      badge: null
    },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Anstehende Aufgaben
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {allTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Keine offenen Aufgaben</p>
        ) : (
          allTasks.map((task) => {
            const urgency = getUrgencyLevel(task.dueDate);
            const config = urgencyConfig[urgency];
            const Icon = config.icon;
            const daysUntil = differenceInDays(new Date(task.dueDate), new Date());

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/audits/${task.auditId}`)}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                  config.bg
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn('h-4 w-4 shrink-0', config.text)} />
                      <p className="font-medium text-foreground truncate">{task.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {task.clientName} • {task.auditType}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {config.badge && (
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs', config.text)}
                      >
                        {config.badge}
                      </Badge>
                    )}
                    <span className={cn('text-xs font-medium', config.text)}>
                      {urgency === 'overdue' 
                        ? `${Math.abs(daysUntil)} Tage überfällig`
                        : daysUntil === 0 
                          ? 'Heute fällig'
                          : `In ${daysUntil} Tagen`
                      }
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
