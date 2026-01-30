import { memo, useMemo } from 'react';
import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { AUDIT_TYPE_LABELS, URGENCY_CONFIG } from '@/lib/constants';
import { getAllPendingTasksWithContext } from '@/lib/auditUtils';
import { getUrgencyLevel, formatDaysUntil } from '@/lib/dateUtils';

interface UpcomingTasksCardProps {
  audits: Audit[];
  maxTasks?: number;
}

// Use subtle icons for tasks - not aggressive
const UrgencyIcon = {
  overdue: Clock,
  critical: Clock,
  warning: Clock,
  normal: Clock,
};

export const UpcomingTasksCard = memo(({ audits, maxTasks = 8 }: UpcomingTasksCardProps) => {
  const navigate = useNavigate();

  const allTasks = useMemo(
    () => getAllPendingTasksWithContext(audits, AUDIT_TYPE_LABELS).slice(0, maxTasks),
    [audits, maxTasks]
  );

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
            const config = URGENCY_CONFIG[urgency];
            const Icon = UrgencyIcon[urgency];

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
                      {formatDaysUntil(task.dueDate)}
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
});

UpcomingTasksCard.displayName = 'UpcomingTasksCard';
