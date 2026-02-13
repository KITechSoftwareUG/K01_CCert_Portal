import { useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { UpcomingTasksCard } from '@/components/UpcomingTasksCard';
import { AlertsCard } from '@/components/AlertsCard';
import { ExpiringCertificationsCard } from '@/components/ExpiringCertificationsCard';
import { DataQualityWarningsCard } from '@/components/DataQualityWarningsCard';
import { MissingAuditorsWarning } from '@/components/MissingAuditorsWarning';
import { SuggestedAuditsCard } from '@/components/SuggestedAuditsCard';
import { DashboardAIChat } from '@/components/DashboardAIChat';
import { useAudits, AuditWithClient } from '@/hooks/useAudits';
import { useAuditTasks } from '@/hooks/useAuditTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ClipboardCheck, AlertTriangle, Calendar, ListTodo } from 'lucide-react';
import { getDaysUntil, isOverdue } from '@/lib/dateUtils';
import { Audit } from '@/types/audit';

// Transform database audit to local Audit type
const transformAuditToLocal = (dbAudit: AuditWithClient, tasks: any[]): Audit => ({
  id: dbAudit.id,
  clientId: dbAudit.client_id,
  clientName: dbAudit.clients?.name || 'Unbekannt',
  type: dbAudit.type,
  certifications: (dbAudit.certifications || []) as any,
  scheduledDate: new Date(dbAudit.scheduled_date),
  status: dbAudit.status,
  tasks: tasks
    .filter(t => t.audit_id === dbAudit.id)
    .map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      status: t.status,
      dueDate: new Date(t.due_date),
      assignedTo: t.assigned_to || undefined,
      completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
    })),
  notes: dbAudit.notes || undefined,
  createdAt: new Date(dbAudit.created_at),
});

const StatCardSkeleton = () => (
  <Card className="h-auto">
    <CardHeader className="pb-1 pt-3 px-4">
      <Skeleton className="h-3 w-20" />
    </CardHeader>
    <CardContent className="pb-3 px-4">
      <Skeleton className="h-7 w-12" />
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { data: dbAudits = [], isLoading: auditsLoading } = useAudits();
  const { data: tasks = [], isLoading: tasksLoading } = useAuditTasks();

  const audits = useMemo(() => 
    dbAudits
      .filter(audit => audit.clients?.is_active !== false)
      .map(audit => transformAuditToLocal(audit, tasks)),
    [dbAudits, tasks]
  );

  const stats = useMemo(() => {
    const activeAudits = audits.filter(a => 
      a.status === 'scheduled' || a.status === 'in-progress'
    );
    
    const upcomingThisMonth = activeAudits.filter(a => {
      const days = getDaysUntil(a.scheduledDate);
      return days >= 0 && days <= 30;
    }).length;

    const allTasks = activeAudits.flatMap(a => a.tasks);
    const overdueTasks = allTasks.filter(t => 
      t.status !== 'completed' && isOverdue(t.dueDate)
    ).length;

    const pendingTasks = allTasks.filter(t => t.status !== 'completed').length;

    return {
      activeAudits: activeAudits.length,
      upcomingThisMonth,
      overdueTasks,
      pendingTasks,
    };
  }, [audits]);

  const isLoading = auditsLoading || tasksLoading;

  return (
    <Layout>
      <div className="p-6 space-y-5 animate-fade-in">
        {/* AI Chat Section */}
        <DashboardAIChat />

        {/* Critical Alerts - Compact */}
        {!isLoading && stats.overdueTasks > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">
              {stats.overdueTasks} überfällige Aufgabe{stats.overdueTasks > 1 ? 'n' : ''} – bitte umgehend bearbeiten
            </p>
          </div>
        )}
        {!isLoading && <MissingAuditorsWarning />}

        {/* Stats Grid - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Aktive Audits"
                value={stats.activeAudits}
                icon={ClipboardCheck}
                variant="default"
                compact
              />
              <StatCard
                title="Diesen Monat"
                value={stats.upcomingThisMonth}
                icon={Calendar}
                variant="accent"
                compact
              />
              <StatCard
                title="Offene Aufgaben"
                value={stats.pendingTasks}
                icon={ListTodo}
                variant="warning"
                compact
              />
              <StatCard
                title="Überfällig"
                value={stats.overdueTasks}
                icon={AlertTriangle}
                variant={stats.overdueTasks > 0 ? 'warning' : 'success'}
                compact
              />
            </>
          )}
        </div>

        {/* Main Content Grid - More Compact */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4">
              <AlertsCard audits={audits} />
              <UpcomingTasksCard audits={audits} />
              <SuggestedAuditsCard />
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <ExpiringCertificationsCard />
              <DataQualityWarningsCard />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
