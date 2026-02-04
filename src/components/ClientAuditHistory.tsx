import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAudits, AuditWithClient } from '@/hooks/useAudits';
import { AUDIT_TYPE_LABELS, AUDIT_STATUS_LABELS, AUDIT_STATUS_COLORS } from '@/lib/constants';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { History, ChevronRight, Calendar, FileCheck } from 'lucide-react';

interface ClientAuditHistoryProps {
  clientId: string;
  limit?: number;
}

export const ClientAuditHistory = ({ clientId, limit = 10 }: ClientAuditHistoryProps) => {
  const navigate = useNavigate();
  const { data: allAudits = [], isLoading } = useAudits();

  // Filter audits for this client and sort by date (newest first)
  const clientAudits = useMemo(() => {
    return allAudits
      .filter(audit => audit.client_id === clientId)
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
      .slice(0, limit);
  }, [allAudits, clientId, limit]);

  const totalAudits = useMemo(() => {
    return allAudits.filter(audit => audit.client_id === clientId).length;
  }, [allAudits, clientId]);

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
        {clientAudits.length > 0 ? (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {clientAudits.map((audit) => (
                <div
                  key={audit.id}
                  onClick={() => navigate(`/audits/${audit.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-primary/10 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-background rounded-lg shadow-sm">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {AUDIT_TYPE_LABELS[audit.type] || audit.type}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${AUDIT_STATUS_COLORS[audit.status] || ''}`}
                        >
                          {AUDIT_STATUS_LABELS[audit.status] || audit.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(audit.scheduled_date), 'dd.MM.yyyy', { locale: de })}
                        </span>
                        {audit.certifications && audit.certifications.length > 0 && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{audit.certifications.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
            {totalAudits > limit && (
              <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t">
                Zeige {limit} von {totalAudits} Audits
              </p>
            )}
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
