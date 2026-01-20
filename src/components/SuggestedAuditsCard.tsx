import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarPlus, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { useAutomaticAuditPlanning, SuggestedAudit } from '@/hooks/useAutomaticAuditPlanning';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const AUDIT_TYPE_LABELS = {
  surveillance: 'Überwachung',
  recertification: 'Rezertifizierung',
};

export const SuggestedAuditsCard = () => {
  const navigate = useNavigate();
  const { suggestions, isLoading, highPriorityCount, totalCount } = useAutomaticAuditPlanning();

  const getPriorityBadge = (priority: SuggestedAudit['priority']) => {
    switch (priority) {
      case 'high':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Dringend
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Bald
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Vorgeschlagene Audits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Laden...</div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Vorgeschlagene Audits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Keine Audit-Vorschläge - alle Zertifizierungen sind aktuell geplant
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Vorgeschlagene Audits
          </div>
          <div className="flex gap-2">
            {highPriorityCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {highPriorityCount} dringend
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {totalCount} Vorschläge
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.clientCertificationId}
                className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                  suggestion.priority === 'high' 
                    ? 'border-destructive/30 bg-destructive/5' 
                    : 'border-border'
                }`}
                onClick={() => navigate(`/certifications/${suggestion.clientCertificationId}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm">
                        {AUDIT_TYPE_LABELS[suggestion.suggestedType]}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.certificationName}
                      </Badge>
                      {getPriorityBadge(suggestion.priority)}
                    </div>
                    <p className="text-sm text-foreground truncate">
                      {suggestion.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vorschlag: {format(suggestion.suggestedDate, 'dd. MMM yyyy', { locale: de })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.reason}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/certifications/${suggestion.clientCertificationId}`);
                    }}
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
