import { Audit, AuditTask } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, AlertTriangle, ListChecks } from 'lucide-react';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface PreparationChecklistProps {
  audits: Audit[];
}

const auditTypeLabels = {
  initial: 'Initialaudit',
  surveillance: 'Überwachungsaudit',
  recertification: 'Re-Zertifizierung',
  'six-month': '6-Monats-Überwachung',
};

export const PreparationChecklist = ({ audits }: PreparationChecklistProps) => {
  const navigate = useNavigate();

  // Get audits happening within next 60 days that need preparation
  const auditsNeedingPrep = audits
    .filter(a => {
      if (a.status === 'completed' || a.status === 'cancelled') return false;
      const days = differenceInDays(new Date(a.scheduledDate), new Date());
      return days >= 0 && days <= 60;
    })
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 4);

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
            const completedTasks = audit.tasks.filter(t => t.status === 'completed').length;
            const totalTasks = audit.tasks.length;
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            const daysUntil = differenceInDays(new Date(audit.scheduledDate), new Date());
            const overdueTasks = audit.tasks.filter(t => 
              t.status !== 'completed' && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
            ).length;

            const getStatusColor = () => {
              if (overdueTasks > 0) return 'destructive';
              if (progress >= 100) return 'success';
              if (progress >= 50) return 'warning';
              return 'secondary';
            };

            return (
              <div
                key={audit.id}
                onClick={() => navigate(`/audits/${audit.id}`)}
                className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{audit.clientName}</p>
                    <p className="text-sm text-muted-foreground">{auditTypeLabels[audit.type]}</p>
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
                      progress >= 100 ? 'text-success' :
                      progress >= 50 ? 'text-foreground' :
                      'text-warning'
                    )}>
                      {completedTasks}/{totalTasks} Aufgaben
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {overdueTasks > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueTasks} Aufgabe{overdueTasks > 1 ? 'n' : ''} überfällig
                  </div>
                )}

                {/* Task preview */}
                <div className="mt-3 space-y-1">
                  {audit.tasks.slice(0, 3).map((task) => {
                    const isOverdue = task.status !== 'completed' && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
                    
                    return (
                      <div 
                        key={task.id} 
                        className="flex items-center gap-2 text-xs"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                        ) : isOverdue ? (
                          <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                        ) : (
                          <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <span className={cn(
                          'truncate',
                          task.status === 'completed' ? 'text-muted-foreground line-through' :
                          isOverdue ? 'text-destructive' : 'text-foreground'
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
};
