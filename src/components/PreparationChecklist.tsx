import { memo, useMemo } from 'react';
import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, AlertTriangle, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { AUDIT_TYPE_LABELS } from '@/lib/constants';
import { getActiveAudits, calculateProgress, getOverdueTasks } from '@/lib/auditUtils';
import { getDaysUntil, isOverdue } from '@/lib/dateUtils';

interface PreparationChecklistProps {
  audits: Audit[];
}

export const PreparationChecklist = memo(({ audits }: PreparationChecklistProps) => {
  const navigate = useNavigate();

  const auditsNeedingPrep = useMemo(() => {
    return getActiveAudits(audits)
      .filter(a => {
        const days = getDaysUntil(a.scheduledDate);
        return days >= 0 && days <= 60;
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 4);
  }, [audits]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Vorbereitungsstatus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {auditsNeedingPrep.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Keine Audits in den nächsten 60 Tagen</p>
        ) : (
          auditsNeedingPrep.map((audit) => {
            const { completed, total, percentage } = calculateProgress(audit.tasks);
            const daysUntil = getDaysUntil(audit.scheduledDate);
            const overdueTasks = getOverdueTasks(audit.tasks);

            return (
              <div
                key={audit.id}
                onClick={() => navigate(`/audits/${audit.id}`)}
                className="p-4 rounded-lg border border-border bg-card card-hover cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{audit.clientName}</p>
                    <p className="text-sm text-muted-foreground">{AUDIT_TYPE_LABELS[audit.type]}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs',
                      daysUntil <= 7 ? 'text-destructive border-destructive/30' :
                      daysUntil <= 30 ? 'text-warning border-warning/30' :
                      'text-muted-foreground'
                    )}
                  >
                    {daysUntil === 0 ? 'Heute' : `In ${daysUntil} Tagen`}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fortschritt</span>
                    <span className={cn(
                      'font-medium',
                      percentage >= 100 ? 'text-success' :
                      percentage >= 50 ? 'text-foreground' :
                      'text-warning'
                    )}>
                      {completed}/{total} Aufgaben
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>

                {overdueTasks.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueTasks.length} Aufgabe{overdueTasks.length > 1 ? 'n' : ''} überfällig
                  </div>
                )}

                {/* Task preview */}
                <div className="mt-3 space-y-1">
                  {audit.tasks.slice(0, 3).map((task) => {
                    const taskOverdue = task.status !== 'completed' && isOverdue(task.dueDate);
                    
                    return (
                      <div key={task.id} className="flex items-center gap-2 text-xs">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                        ) : taskOverdue ? (
                          <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                        ) : (
                          <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <span className={cn(
                          'truncate',
                          task.status === 'completed' ? 'text-muted-foreground line-through' :
                          taskOverdue ? 'text-destructive' : 'text-foreground'
                        )}>
                          {task.title}
                        </span>
                      </div>
                    );
                  })}
                  {audit.tasks.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-5">
                      +{audit.tasks.length - 3} weitere
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
});

PreparationChecklist.displayName = 'PreparationChecklist';
