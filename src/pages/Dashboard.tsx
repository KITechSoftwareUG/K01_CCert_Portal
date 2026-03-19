import { useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { useAudits } from '@/hooks/useAudits';
import { useAllAuditTasks } from '@/hooks/useAuditTasks';
import { transformAuditToLocal } from '@/lib/auditUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpiringCertificationsCard } from '@/components/ExpiringCertificationsCard';
import { DataQualityWarningsCard } from '@/components/DataQualityWarningsCard';
import { AlertsCard } from '@/components/AlertsCard';
import { AuditYearStatsCard } from '@/components/AuditYearStatsCard';
import { CertificationYearStatsCard } from '@/components/CertificationYearStatsCard';
import { OpenTasksCard } from '@/components/OpenTasksCard';
import { DashboardAIChat } from '@/components/DashboardAIChat';

const Dashboard = () => {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: dbAudits = [], isLoading: auditsLoading } = useAudits();
  const { data: dbTasks = [], isLoading: tasksLoading } = useAllAuditTasks();

  const audits = useMemo(() => {
    return dbAudits.map(audit => transformAuditToLocal(audit, dbTasks));
  }, [dbAudits, dbTasks]);

  const clientStats = useMemo(() => {
    const totalLocations = clients.length;
    const activeLocations = clients.filter((c: any) => c.is_active !== false).length;
    const inactiveLocations = totalLocations - activeLocations;

    // Count unique groups/independent companies
    const companyIds = new Set();
    clients.forEach((c: any) => {
      if (c.parent_client_id) {
        companyIds.add(c.parent_client_id);
      } else {
        companyIds.add(c.id);
      }
    });
    const totalCompanies = companyIds.size;

    return {
      totalLocations,
      activeLocations,
      inactiveLocations,
      totalCompanies
    };
  }, [clients]);

  if (clientsLoading || auditsLoading || tasksLoading) {
    return (
      <div className="p-4 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Willkommen zurück im CCert Portal.</p>
      </div>

      <DashboardAIChat />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-primary/5 border-primary/20 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-primary">
            <CardTitle className="text-sm font-medium">Kundenübersicht</CardTitle>
            <Building2 className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{clientStats.totalCompanies}</span>
              <span className="text-sm font-medium text-muted-foreground">Unternehmen</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-semibold">{clientStats.totalLocations}</span>
              <span className="text-xs text-muted-foreground">
                Standorte ({clientStats.activeLocations} aktiv
                {clientStats.inactiveLocations > 0 ? `, ${clientStats.inactiveLocations} inaktiv` : ''})
              </span>
            </div>
          </CardContent>
        </Card>

        <AuditYearStatsCard />
        <CertificationYearStatsCard />
      </div>

      {/* Second Row: Alerts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <AlertsCard audits={audits} />
        </div>
        <div className="lg:col-span-7 space-y-6">
          <OpenTasksCard />
        </div>
      </div>

      {/* Third Row: Expiring Certifications */}
      <div className="grid grid-cols-1 gap-6">
        <ExpiringCertificationsCard />
      </div>

      {/* Fourth Row: Data Quality */}
      <div className="grid grid-cols-1 gap-6">
        <DataQualityWarningsCard />
      </div>
    </div>
  );
};

export default Dashboard;
