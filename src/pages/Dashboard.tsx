import { useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { UpcomingTasksCard } from '@/components/UpcomingTasksCard';
import { AuditTimeline } from '@/components/AuditTimeline';
import { AlertsCard } from '@/components/AlertsCard';
import { PreparationChecklist } from '@/components/PreparationChecklist';
import { mockAudits } from '@/lib/mockData';
import { ClipboardCheck, AlertTriangle, Calendar, ListTodo } from 'lucide-react';
import { getActiveAudits, getOverdueTasks, getPendingTasks } from '@/lib/auditUtils';
import { getDaysUntil } from '@/lib/dateUtils';

const Dashboard = () => {
  const stats = useMemo(() => {
    const activeAudits = getActiveAudits(mockAudits);
    
    const upcomingThisMonth = activeAudits.filter(a => {
      const days = getDaysUntil(a.scheduledDate);
      return days >= 0 && days <= 30;
    }).length;

    const allTasks = activeAudits.flatMap(a => a.tasks);
    const overdueTasks = allTasks.filter(t => 
      t.status !== 'completed' && getOverdueTasks([{ tasks: [t] } as any]).length > 0
    ).length;

    const pendingTasks = allTasks.filter(t => t.status !== 'completed').length;

    return {
      activeAudits: activeAudits.length,
      upcomingThisMonth,
      overdueTasks,
      pendingTasks,
    };
  }, []);

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Audit-Übersicht</h1>
          <p className="text-muted-foreground">Planung und Vorbereitung Ihrer Zertifizierungsaudits</p>
        </div>

        {/* Critical Alerts Banner */}
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts & Tasks */}
          <div className="lg:col-span-2 space-y-6">
            <AlertsCard audits={mockAudits} />
            <UpcomingTasksCard audits={mockAudits} />
          </div>

          {/* Right Column - Preparation */}
          <div className="space-y-6">
            <PreparationChecklist audits={mockAudits} />
          </div>
        </div>

        {/* Full Width Timeline */}
        <AuditTimeline audits={mockAudits} />
      </div>
    </Layout>
  );
};

export default Dashboard;
