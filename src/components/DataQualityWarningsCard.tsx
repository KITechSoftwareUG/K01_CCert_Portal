import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ChevronRight, UserX, CalendarX, FileWarning } from 'lucide-react';
import { useAllClientCertifications } from '@/hooks/useClientCertifications';

interface DataQualityIssue {
  id: string;
  clientCertificationId: string;
  clientName: string;
  certificationName: string;
  type: 'missing_auditor' | 'missing_validity' | 'missing_both';
  description: string;
}

export const DataQualityWarningsCard = () => {
  const navigate = useNavigate();
  const { data: certifications = [], isLoading } = useAllClientCertifications();

  const issues = useMemo(() => {
    const result: DataQualityIssue[] = [];

    for (const cert of certifications) {
      const hasAuditor = !!cert.auditor_id;
      const hasValidity = !!cert.valid_until;
      
      if (!hasAuditor && !hasValidity) {
        result.push({
          id: `both-${cert.id}`,
          clientCertificationId: cert.id,
          clientName: (cert as any).clients?.name || 'Unbekannt',
          certificationName: cert.certifications?.name || 'Unbekannt',
          type: 'missing_both',
          description: 'Auditor und Gültigkeit fehlen',
        });
      } else if (!hasAuditor) {
        result.push({
          id: `auditor-${cert.id}`,
          clientCertificationId: cert.id,
          clientName: (cert as any).clients?.name || 'Unbekannt',
          certificationName: cert.certifications?.name || 'Unbekannt',
          type: 'missing_auditor',
          description: 'Kein Auditor zugewiesen',
        });
      } else if (!hasValidity) {
        result.push({
          id: `validity-${cert.id}`,
          clientCertificationId: cert.id,
          clientName: (cert as any).clients?.name || 'Unbekannt',
          certificationName: cert.certifications?.name || 'Unbekannt',
          type: 'missing_validity',
          description: 'Gültigkeitsdatum fehlt',
        });
      }
    }

    // Sort by severity (missing_both first)
    return result.sort((a, b) => {
      const severityOrder = { missing_both: 0, missing_auditor: 1, missing_validity: 2 };
      return severityOrder[a.type] - severityOrder[b.type];
    });
  }, [certifications]);

  const stats = useMemo(() => ({
    missingBoth: issues.filter(i => i.type === 'missing_both').length,
    missingAuditor: issues.filter(i => i.type === 'missing_auditor').length,
    missingValidity: issues.filter(i => i.type === 'missing_validity').length,
    total: issues.length,
  }), [issues]);

  const getIssueIcon = (type: DataQualityIssue['type']) => {
    switch (type) {
      case 'missing_auditor':
        return <UserX className="h-4 w-4 text-amber-500" />;
      case 'missing_validity':
        return <CalendarX className="h-4 w-4 text-amber-500" />;
      case 'missing_both':
        return <FileWarning className="h-4 w-4 text-destructive" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Datenqualität
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Laden...</div>
        </CardContent>
      </Card>
    );
  }

  if (issues.length === 0) {
    return null; // Hide card if no issues
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Datenqualität
          </div>
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            {stats.total} Probleme
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary */}
        <div className="flex flex-wrap gap-2 mb-4">
          {stats.missingBoth > 0 && (
            <Badge variant="destructive" className="text-xs">
              <FileWarning className="h-3 w-3 mr-1" />
              {stats.missingBoth} unvollständig
            </Badge>
          )}
          {stats.missingAuditor > 0 && (
            <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
              <UserX className="h-3 w-3 mr-1" />
              {stats.missingAuditor} ohne Auditor
            </Badge>
          )}
          {stats.missingValidity > 0 && (
            <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
              <CalendarX className="h-3 w-3 mr-1" />
              {stats.missingValidity} ohne Gültigkeit
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                  issue.type === 'missing_both' 
                    ? 'border-destructive/30 bg-destructive/5' 
                    : 'border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10'
                }`}
                onClick={() => navigate(`/certifications/${issue.clientCertificationId}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getIssueIcon(issue.type)}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {issue.certificationName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {issue.clientName} • {issue.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
