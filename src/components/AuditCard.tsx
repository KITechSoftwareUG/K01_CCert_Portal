import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Building2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AuditCardProps {
  audit: Audit;
  onViewDetails?: (audit: Audit) => void;
}

const auditTypeLabels = {
  initial: 'Initialaudit',
  surveillance: 'Überwachungsaudit',
  recertification: 'Re-Zertifizierung',
  'six-month': '6-Monats-Überwachung',
};

const statusConfig = {
  scheduled: { label: 'Geplant', variant: 'secondary' as const, icon: Clock },
  'in-progress': { label: 'In Bearbeitung', variant: 'default' as const, icon: AlertCircle },
  completed: { label: 'Abgeschlossen', variant: 'default' as const, icon: CheckCircle2 },
  cancelled: { label: 'Abgebrochen', variant: 'destructive' as const, icon: AlertCircle },
};

export const AuditCard = ({ audit, onViewDetails }: AuditCardProps) => {
  const statusInfo = statusConfig[audit.status];
  const StatusIcon = statusInfo.icon;
  
  const completedTasks = audit.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = audit.tasks.length;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{audit.clientName}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{auditTypeLabels[audit.type]}</span>
            </div>
          </div>
          <Badge 
            variant={statusInfo.variant}
            className={cn(
              'flex items-center gap-1',
              audit.status === 'in-progress' && 'bg-warning text-warning-foreground',
              audit.status === 'completed' && 'bg-success text-success-foreground'
            )}
          >
            <StatusIcon className="h-3 w-3" />
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

        {totalTasks > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Aufgaben</span>
              <span className="font-medium text-foreground">
                {completedTasks}/{totalTasks}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
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
};
