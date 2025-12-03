import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { UpcomingTasksCard } from '@/components/UpcomingTasksCard';
import { AuditTimeline } from '@/components/AuditTimeline';
import { AlertsCard } from '@/components/AlertsCard';
import { PreparationChecklist } from '@/components/PreparationChecklist';
import { mockAudits } from '@/lib/mockData';
import { ClipboardCheck, AlertTriangle, Calendar, ListTodo } from 'lucide-react';
import { differenceInDays, isPast, isToday, addDays, isWithinInterval } from 'date-fns';

const Dashboard = () => {
  const now = new Date();
  
  // Calculate stats
  const activeAudits = mockAudits.filter(a => 
    a.status !== 'completed' && a.status !== 'cancelled'
  ).length;
  
  const upcomingThisMonth = mockAudits.filter(a => {
    const days = differenceInDays(new Date(a.scheduledDate), now);
    return days >= 0 && days <= 30 && a.status !== 'completed' && a.status !== 'cancelled';
  }).length;

  // Count all overdue tasks
  const overdueTasks = mockAudits
    .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
    .flatMap(a => a.tasks)
    .filter(t => t.status !== 'completed' && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)))
    .length;

  // Count all pending tasks
  const pendingTasks = mockAudits
    .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
    .flatMap(a => a.tasks)
    .filter(t => t.status !== 'completed')
    .length;

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Audit-Übersicht</h1>
          <p className="text-muted-foreground">Planung und Vorbereitung Ihrer Zertifizierungsaudits</p>
        </div>

        {/* Critical Alerts Banner */}
        {overdueTasks > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">
                Achtung: {overdueTasks} überfällige Aufgabe{overdueTasks > 1 ? 'n' : ''}
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
            value={activeAudits}
            icon={ClipboardCheck}
            variant="default"
          />
          <StatCard
            title="Audits diesen Monat"
            value={upcomingThisMonth}
            icon={Calendar}
            variant="accent"
          />
          <StatCard
            title="Offene Aufgaben"
            value={pendingTasks}
            icon={ListTodo}
            variant="warning"
          />
          <StatCard
            title="Überfällige Aufgaben"
            value={overdueTasks}
            icon={AlertTriangle}
            variant={overdueTasks > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts & Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alerts */}
            <AlertsCard audits={mockAudits} />
            
            {/* Upcoming Tasks */}
            <UpcomingTasksCard audits={mockAudits} />
          </div>

          {/* Right Column - Timeline & Preparation */}
          <div className="space-y-6">
            {/* Preparation Status */}
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
