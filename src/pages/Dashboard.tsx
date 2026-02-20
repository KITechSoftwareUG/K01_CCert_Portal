import { useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';

import { AlertsCard } from '@/components/AlertsCard';
import { ExpiringCertificationsCard } from '@/components/ExpiringCertificationsCard';

import { MissingAuditorsWarning } from '@/components/MissingAuditorsWarning';
import { SuggestedAuditsCard } from '@/components/SuggestedAuditsCard';
import { DashboardAIChat } from '@/components/DashboardAIChat';
import { useAudits } from '@/hooks/useAudits';
import { transformAuditToLocal } from '@/lib/auditUtils';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ClipboardCheck, Calendar } from 'lucide-react';
import { getDaysUntil } from '@/lib/dateUtils';

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
  

  const audits = useMemo(() => 
    dbAudits
      .filter(audit => audit.clients?.is_active !== false)
      .map(audit => transformAuditToLocal(audit)),
    [dbAudits]
  );

  const stats = useMemo(() => {
    const activeAudits = audits.filter(a => 
      a.status === 'scheduled' || a.status === 'in-progress'
    );
    
    const upcomingThisMonth = activeAudits.filter(a => {
      const days = getDaysUntil(a.scheduledDate);
      return days >= 0 && days <= 30;
    }).length;

    return {
      activeAudits: activeAudits.length,
      upcomingThisMonth,
    };
  }, [audits]);

  const isLoading = auditsLoading;

  return (
    <Layout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
        {/* AI Chat - Hero Section */}
        <DashboardAIChat />

        {!isLoading && <MissingAuditorsWarning />}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {isLoading ? (
            <>
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
            </>
          )}
        </div>

        {/* Main Content - Prioritized Layout */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Expiring Certs + Alerts (most critical info first) */}
            <div className="lg:col-span-5 space-y-5">
              <ExpiringCertificationsCard />
            </div>

            {/* Right: Tasks + Suggested Audits (actionable items) */}
            <div className="lg:col-span-7 space-y-5">
              <AlertsCard audits={audits} />
              
              <SuggestedAuditsCard />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
