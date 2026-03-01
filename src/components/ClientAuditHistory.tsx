import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAudits, AuditWithClient } from '@/hooks/useAudits';
import { useAllAuditTasks } from '@/hooks/useAuditTasks';
import { AUDIT_TYPE_LABELS, AUDIT_STATUS_LABELS, AUDIT_STATUS_COLORS } from '@/lib/constants';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { History, ChevronRight, Calendar, FileCheck, CalendarClock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ClientAuditHistoryProps {
  clientId: string;
}

const getCertificationName = (audit: AuditWithClient): string | null => {
  const name = audit.client_certifications?.certifications?.name;
  if (name) return name;
  if (audit.certifications && audit.certifications.length > 0) return audit.certifications.join(', ');
  return null;
};

const SEVERITY_LABELS: Record<string, string> = {
  major: 'Haupt-NK',
  minor: 'Neben-NK',
  recommendation: 'Empfehlung',
};

const AuditRow = ({ audit, nkCount, onClick }: { audit: AuditWithClient; nkCount: number; onClick: () => void }) => {
  const certName = getCertificationName(audit);
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-primary/10 cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2 bg-background rounded-lg shadow-sm">
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {AUDIT_TYPE_LABELS[audit.type] || audit.type}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${AUDIT_STATUS_COLORS[audit.status] || ''}`}
            >
              {AUDIT_STATUS_LABELS[audit.status] || audit.status}
            </Badge>
            {nkCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {nkCount} NK offen
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(audit.scheduled_date), 'dd.MM.yyyy', { locale: de })}
            </span>
            {certName && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>{certName}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </div>
  );
};

export const ClientAuditHistory = ({ clientId }: ClientAuditHistoryProps) => {
  const navigate = useNavigate();
  const { data: allAudits = [], isLoading } = useAudits();
  const { data: allTasks = [] } = useAllAuditTasks();

  const clientAuditIds = useMemo(() => {
    return new Set(allAudits.filter(a => a.client_id === clientId).map(a => a.id));
  }, [allAudits, clientId]);

  const openFindingsByAudit = useMemo(() => {
    const map: Record<string, number> = {};
    for (const task of allTasks) {
      if (
        task.category === 'finding' &&
        task.status !== 'completed' &&
        clientAuditIds.has(task.audit_id)
      ) {
        map[task.audit_id] = (map[task.audit_id] || 0) + 1;
      }
    }
    return map;
  }, [allTasks, clientAuditIds]);

  const totalOpenFindings = useMemo(() => {
    return Object.values(openFindingsByAudit).reduce((sum, n) => sum + n, 0);
  }, [openFindingsByAudit]);

  const openFindingsSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of allTasks) {
      if (
        task.category === 'finding' &&
        task.status !== 'completed' &&
        clientAuditIds.has(task.audit_id) &&
        task.severity
      ) {
        counts[task.severity] = (counts[task.severity] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([sev, count]) => `${count} ${SEVERITY_LABELS[sev] || sev}`)
      .join(', ');
  }, [allTasks, clientAuditIds]);

  const { activeAudits, completedAudits } = useMemo(() => {
    const audits = allAudits.filter(audit => audit.client_id === clientId);
    const activeStatuses = ['scheduled', 'in-progress'];

    const active = audits
      .filter(a => activeStatuses.includes(a.status))
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());

    const completed = audits
      .filter(a => !activeStatuses.includes(a.status))
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());

    return { activeAudits: active, completedAudits: completed };
  }, [allAudits, clientId]);

  const totalAudits = activeAudits.length + completedAudits.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit-Historie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Audit-Historie
          {totalAudits > 0 && (
            <Badge variant="secondary" className="ml-2">
              {totalAudits} {totalAudits === 1 ? 'Audit' : 'Audits'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Open NK Warning Banner */}
        {totalOpenFindings > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">
                {totalOpenFindings} offene Nicht-Konformität{totalOpenFindings !== 1 ? 'en' : ''} aus früheren Audits
              </span>
              {openFindingsSummary && (
                <span className="text-sm ml-1">({openFindingsSummary})</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {totalAudits > 0 ? (
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-4">
              {activeAudits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    <span>Geplant / Laufend</span>
                    <Badge variant="outline" className="text-xs ml-1">{activeAudits.length}</Badge>
                  </div>
                  {activeAudits.map((audit) => (
                    <AuditRow key={audit.id} audit={audit} nkCount={openFindingsByAudit[audit.id] || 0} onClick={() => navigate(`/audits/${audit.id}`)} />
                  ))}
                </div>
              )}

              {activeAudits.length > 0 && completedAudits.length > 0 && (
                <Separator />
              )}

              {completedAudits.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Abgeschlossen</span>
                    <Badge variant="outline" className="text-xs ml-1">{completedAudits.length}</Badge>
                  </div>
                  {completedAudits.map((audit) => (
                    <AuditRow key={audit.id} audit={audit} nkCount={openFindingsByAudit[audit.id] || 0} onClick={() => navigate(`/audits/${audit.id}`)} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Noch keine Audits vorhanden</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Audits werden hier angezeigt, sobald sie erstellt werden
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
