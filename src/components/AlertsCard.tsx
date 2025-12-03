import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, Calendar, ArrowRight } from 'lucide-react';
import { format, differenceInDays, isPast, isToday, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Alert {
  id: string;
  type: 'overdue' | 'upcoming-audit' | 'task-due-soon';
  title: string;
  description: string;
  auditId: string;
  severity: 'critical' | 'warning' | 'info';
}

interface AlertsCardProps {
  audits: Audit[];
}

const auditTypeLabels = {
  initial: 'Initialaudit',
  surveillance: 'Überwachungsaudit',
  recertification: 'Re-Zertifizierung',
  'six-month': '6-Monats-Überwachung',
};

export const AlertsCard = ({ audits }: AlertsCardProps) => {
  const navigate = useNavigate();

  // Generate alerts from audits
  const alerts: Alert[] = [];

  audits
    .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
    .forEach(audit => {
      // Check for overdue tasks
      const overdueTasks = audit.tasks.filter(t => 
        t.status !== 'completed' && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
      );
      
      if (overdueTasks.length > 0) {
        alerts.push({
          id: `overdue-${audit.id}`,
          type: 'overdue',
          title: `${overdueTasks.length} überfällige Aufgabe${overdueTasks.length > 1 ? 'n' : ''}`,
          description: `${audit.clientName} - ${auditTypeLabels[audit.type]}`,
          auditId: audit.id,
          severity: 'critical',
        });
      }

      // Check for audit coming up within 7 days
      const daysUntilAudit = differenceInDays(new Date(audit.scheduledDate), new Date());
      if (daysUntilAudit >= 0 && daysUntilAudit <= 7) {
        const pendingTasks = audit.tasks.filter(t => t.status !== 'completed').length;
        alerts.push({
          id: `upcoming-${audit.id}`,
          type: 'upcoming-audit',
          title: `Audit in ${daysUntilAudit} Tag${daysUntilAudit !== 1 ? 'en' : ''}`,
          description: `${audit.clientName} - ${pendingTasks} offene Aufgaben`,
          auditId: audit.id,
          severity: daysUntilAudit <= 3 ? 'critical' : 'warning',
        });
      }

      // Check for tasks due within 3 days
      audit.tasks
        .filter(t => t.status !== 'completed')
        .forEach(task => {
          const daysUntilDue = differenceInDays(new Date(task.dueDate), new Date());
          if (daysUntilDue >= 0 && daysUntilDue <= 3 && !isPast(new Date(task.dueDate))) {
            alerts.push({
              id: `task-${task.id}`,
              type: 'task-due-soon',
              title: task.title,
              description: `Fällig ${daysUntilDue === 0 ? 'heute' : `in ${daysUntilDue} Tag${daysUntilDue !== 1 ? 'en' : ''}`} - ${audit.clientName}`,
              auditId: audit.id,
              severity: daysUntilDue === 0 ? 'critical' : 'warning',
            });
          }
        });
    });

  // Sort by severity
  const sortedAlerts = alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  }).slice(0, 6);

  const severityConfig = {
    critical: {
      bg: 'bg-destructive/10 border-destructive/30',
      icon: AlertTriangle,
      iconColor: 'text-destructive',
    },
    warning: {
      bg: 'bg-warning/10 border-warning/30',
      icon: Bell,
      iconColor: 'text-warning',
    },
    info: {
      bg: 'bg-accent/10 border-accent/30',
      icon: Calendar,
      iconColor: 'text-accent-foreground',
    },
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Warnungen & Erinnerungen
          {sortedAlerts.filter(a => a.severity === 'critical').length > 0 && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
              {sortedAlerts.filter(a => a.severity === 'critical').length} kritisch
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Keine Warnungen - Alles im grünen Bereich!</p>
          </div>
        ) : (
          sortedAlerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                onClick={() => navigate(`/audits/${alert.auditId}`)}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md flex items-center gap-3',
                  config.bg
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', config.iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{alert.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
