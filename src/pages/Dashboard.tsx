import { useMemo } from 'react';
import { useAudits } from '@/hooks/useAudits';
import { transformAuditToLocal } from '@/lib/auditUtils';
import { useClients } from '@/hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpiringCertificationsCard } from '@/components/ExpiringCertificationsCard';
import { DataQualityWarningsCard } from '@/components/DataQualityWarningsCard';
import { AlertsCard } from '@/components/AlertsCard';
import { AuditYearStatsCard } from '@/components/AuditYearStatsCard';
import { CertificationYearStatsCard } from '@/components/CertificationYearStatsCard';
import { RecentActivityCard } from '@/components/RecentActivityCard';

const Dashboard = () => {
  const { data: clients = [], isLoading: clientsLoading } = useClients();

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

  if (clientsLoading) {
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

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/10 border-white/20">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 text-primary">
            <CardTitle className="text-sm font-medium">Unternehmen</CardTitle>
            <Building2 className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientStats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Gruppen & Einzelgesellschaften
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-sm font-medium">Standorte (Gesamt)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientStats.totalLocations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600 font-medium">{clientStats.activeLocations} aktiv</span>
              {clientStats.inactiveLocations > 0 && ` • ${clientStats.inactiveLocations} inaktiv`}
            </p>
          </CardContent>
        </Card>

        <AuditYearStatsCard />
        <CertificationYearStatsCard />
      </div>

      {/* Second Row: Alerts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AlertsCard />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExpiringCertificationsCard />
            <DataQualityWarningsCard />
          </div>
        </div>
        <div className="space-y-6">
          <RecentActivityCard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
