import { useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { AlertsCard } from '@/components/AlertsCard';
import { ExpiringCertificationsCard } from '@/components/ExpiringCertificationsCard';
import { DataQualityWarningsCard } from '@/components/DataQualityWarningsCard';
import { SuggestedAuditsCard } from '@/components/SuggestedAuditsCard';
import { CountryStatsCard } from '@/components/CountryStatsCard';
import { AuditYearStatsCard } from '@/components/AuditYearStatsCard';
import { DashboardAIChat } from '@/components/DashboardAIChat';
import { useAudits } from '@/hooks/useAudits';
import { useClients } from '@/hooks/useClients';
import { transformAuditToLocal } from '@/lib/auditUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Users, UserCheck, UserX } from 'lucide-react';

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
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const audits = useMemo(() => 
    dbAudits
      .filter(audit => audit.clients?.is_active !== false)
      .map(audit => transformAuditToLocal(audit)),
    [dbAudits]
  );

  const clientStats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.is_active !== false).length;
    const inactive = clients.filter(c => c.is_active === false).length;
    return { total, active, inactive };
  }, [clients]);

  const isLoading = auditsLoading || clientsLoading;

  return (
    <Layout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
        {/* AI Chat - Hero Section */}
        <DashboardAIChat />

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Kunden gesamt"
                value={clientStats.total}
                icon={Users}
                variant="default"
                compact
              />
              <StatCard
                title="Aktiv"
                value={clientStats.active}
                icon={UserCheck}
                variant="success"
                compact
              />
              <StatCard
                title="Inaktiv"
                value={clientStats.inactive}
                icon={UserX}
                variant="warning"
                compact
              />
            </>
          )}
        </div>

        {/* Country Stats */}
        {!isLoading && <CountryStatsCard />}

        {/* Main Content - Prioritized Layout */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Expiring Certs + Data Quality */}
            <div className="lg:col-span-5 space-y-5">
              <ExpiringCertificationsCard />
              <DataQualityWarningsCard />
            </div>

            {/* Right: Alerts + Audit Year Stats + Suggested Audits */}
            <div className="lg:col-span-7 space-y-5">
              <AlertsCard audits={audits} />
              <AuditYearStatsCard />
              <SuggestedAuditsCard />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
