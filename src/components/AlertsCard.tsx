import { memo, useMemo } from 'react';
import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Bell, Calendar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { AUDIT_TYPE_LABELS, ALERT_SEVERITY_CONFIG } from '@/lib/constants';
import { getActiveAudits, getOverdueTasks, getPendingTasks, transformAuditToLocal } from '@/lib/auditUtils';
import { getDaysUntil, isOverdue } from '@/lib/dateUtils';
import { useAudits } from '@/hooks/useAudits';
import { useAuditTasks } from '@/hooks/useAuditTasks';

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

const AlertIcon = {
  critical: AlertTriangle,
  warning: Bell,
  info: Calendar,
};

export const AlertsCard = memo(({ audits }: AlertsCardProps) => {
  const navigate = useNavigate();

  const sortedAlerts = useMemo(() => {
    const alerts: Alert[] = [];

    getActiveAudits(audits).forEach(audit => {
      // Check for overdue tasks
      const overdueTasks = getOverdueTasks(audit.tasks);
      
      if (overdueTasks.length > 0) {
        alerts.push({
          id: `overdue-${audit.id}`,
          type: 'overdue',
          title: `${overdueTasks.length} überfällige Aufgabe${overdueTasks.length > 1 ? 'n' : ''}`,
          description: `${audit.clientName} - ${AUDIT_TYPE_LABELS[audit.type]}`,
          auditId: audit.id,
          severity: 'critical',
        });
      }

      // Check for audit coming up within 7 days
      const daysUntilAudit = getDaysUntil(audit.scheduledDate);
      if (daysUntilAudit >= 0 && daysUntilAudit <= 7) {
        const pendingCount = getPendingTasks(audit.tasks).length;
        alerts.push({
          id: `upcoming-${audit.id}`,
          type: 'upcoming-audit',
          title: `Audit in ${daysUntilAudit} Tag${daysUntilAudit !== 1 ? 'en' : ''}`,
          description: `${audit.clientName} - ${pendingCount} offene Aufgaben`,
          auditId: audit.id,
          severity: daysUntilAudit <= 3 ? 'critical' : 'warning',
        });
      }

      // Check for tasks due within 3 days
      getPendingTasks(audit.tasks).forEach(task => {
        const daysUntilDue = getDaysUntil(task.dueDate);
        if (daysUntilDue >= 0 && daysUntilDue <= 3 && !isOverdue(task.dueDate)) {
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

    // Sort by severity and limit
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return alerts
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, 6);
  }, [audits]);

  const criticalCount = useMemo(
    () => sortedAlerts.filter(a => a.severity === 'critical').length,
    [sortedAlerts]
  );

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Warnungen & Erinnerungen
          {criticalCount > 0 && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
              {criticalCount} kritisch
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
            const config = ALERT_SEVERITY_CONFIG[alert.severity];
            const Icon = AlertIcon[alert.severity];

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
});

AlertsCard.displayName = 'AlertsCard';
