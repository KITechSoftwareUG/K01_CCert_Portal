import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { AuditCard } from '@/components/AuditCard';
import { mockAudits } from '@/lib/mockData';
import { ClipboardCheck, Users, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isWithinInterval, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

const Dashboard = () => {
  const upcomingAudits = mockAudits
    .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
    .slice(0, 3);

  const activeAudits = mockAudits.filter(a => a.status === 'in-progress').length;
  const scheduledAudits = mockAudits.filter(a => a.status === 'scheduled').length;
  
  const now = new Date();
  const upcomingThisWeek = mockAudits.filter(a => 
    isWithinInterval(a.scheduledDate, { start: now, end: addDays(now, 7) })
  ).length;

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Übersicht über alle Audits und anstehende Termine</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Aktive Audits"
            value={activeAudits}
            icon={ClipboardCheck}
            variant="default"
          />
          <StatCard
            title="Geplante Audits"
            value={scheduledAudits}
            icon={Calendar}
            variant="accent"
          />
          <StatCard
            title="Diese Woche"
            value={upcomingThisWeek}
            icon={TrendingUp}
            variant="warning"
          />
          <StatCard
            title="Gesamt Kunden"
            value={3}
            icon={Users}
            variant="success"
          />
        </div>

        {/* Upcoming Audits */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Anstehende Audits</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {upcomingAudits.map((audit) => (
              <AuditCard key={audit.id} audit={audit} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockAudits.slice(0, 3).map((audit) => (
              <div key={audit.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{audit.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(audit.createdAt, 'dd. MMMM yyyy', { locale: de })}
                  </p>
                </div>
                <Badge variant="outline">{audit.certifications[0]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
