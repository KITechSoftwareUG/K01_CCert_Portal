import { memo } from 'react';
import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Building2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AUDIT_TYPE_LABELS, AUDIT_STATUS_CONFIG } from '@/lib/constants';
import { calculateProgress } from '@/lib/auditUtils';

interface AuditCardProps {
  audit: Audit;
  onViewDetails?: (audit: Audit) => void;
}

const StatusIcon = {
  scheduled: Clock,
  'in-progress': AlertCircle,
  completed: CheckCircle2,
  cancelled: AlertCircle,
};

export const AuditCard = memo(({ audit, onViewDetails }: AuditCardProps) => {
  const statusInfo = AUDIT_STATUS_CONFIG[audit.status];
  const Icon = StatusIcon[audit.status];
  const { completed, total, percentage } = calculateProgress(audit.tasks);

  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{audit.clientName}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{AUDIT_TYPE_LABELS[audit.type]}</span>
            </div>
          </div>
          <Badge 
            variant={statusInfo.variant}
            className={cn('flex items-center gap-1', statusInfo.className)}
          >
            <Icon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">
              {format(audit.scheduledDate, 'dd. MMMM yyyy', { locale: de })}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {audit.certifications.map((cert) => (
              <Badge key={cert} variant="outline" className="text-xs">
                {cert}
              </Badge>
            ))}
          </div>
        </div>

        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Aufgaben</span>
              <span className="font-medium text-foreground">
                {completed}/{total}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        <Button 
          onClick={() => onViewDetails?.(audit)} 
          className="w-full"
          variant="outline"
        >
          Details anzeigen
        </Button>
      </CardContent>
    </Card>
  );
});

AuditCard.displayName = 'AuditCard';
