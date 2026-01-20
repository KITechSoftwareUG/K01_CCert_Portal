import { useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { UpcomingTasksCard } from '@/components/UpcomingTasksCard';
import { AuditTimeline } from '@/components/AuditTimeline';
import { AlertsCard } from '@/components/AlertsCard';
import { PreparationChecklist } from '@/components/PreparationChecklist';
import { ExpiringCertificationsCard } from '@/components/ExpiringCertificationsCard';
import { DataQualityWarningsCard } from '@/components/DataQualityWarningsCard';
import { MissingAuditorsWarning } from '@/components/MissingAuditorsWarning';
import { SuggestedAuditsCard } from '@/components/SuggestedAuditsCard';
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
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16" />
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { data: dbAudits = [], isLoading: auditsLoading } = useAudits();
  const { data: tasks = [], isLoading: tasksLoading } = useAuditTasks();

  const audits = useMemo(() => 
    dbAudits.map(audit => transformAuditToLocal(audit, tasks)),
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
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Audit-Übersicht</h1>
          <p className="text-muted-foreground">Planung und Vorbereitung Ihrer Zertifizierungsaudits</p>
        </div>

        {/* Critical Alerts Banners */}
        {!isLoading && (
          <div className="space-y-3">
            {stats.overdueTasks > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3 animate-slide-up">
                <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-destructive">
                    Achtung: {stats.overdueTasks} überfällige Aufgabe{stats.overdueTasks > 1 ? 'n' : ''}
                  </p>
                  <p className="text-sm text-destructive/80">
                    Es gibt Aufgaben, die ihre Fälligkeit überschritten haben. Bitte umgehend bearbeiten.
                  </p>
                </div>
              </div>
            )}
            <MissingAuditorsWarning />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              />
              <StatCard
                title="Audits diesen Monat"
                value={stats.upcomingThisMonth}
                icon={Calendar}
                variant="accent"
              />
              <StatCard
                title="Offene Aufgaben"
                value={stats.pendingTasks}
                icon={ListTodo}
                variant="warning"
              />
              <StatCard
                title="Überfällige Aufgaben"
                value={stats.overdueTasks}
                icon={AlertTriangle}
                variant={stats.overdueTasks > 0 ? 'warning' : 'success'}
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        {!isLoading && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Alerts & Tasks */}
              <div className="lg:col-span-2 space-y-6">
                <AlertsCard audits={audits} />
                <UpcomingTasksCard audits={audits} />
                <SuggestedAuditsCard />
              </div>

              {/* Right Column - Expiring Certs, Preparation & Data Quality */}
              <div className="space-y-6">
                <ExpiringCertificationsCard />
                <DataQualityWarningsCard />
                <PreparationChecklist audits={audits} />
              </div>
            </div>

            {/* Full Width Timeline - temporarily hidden */}
            {/* <AuditTimeline audits={audits} /> */}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
