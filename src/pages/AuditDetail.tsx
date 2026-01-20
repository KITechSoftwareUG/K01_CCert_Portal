import { useState, useCallback, memo, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAudit } from '@/hooks/useAudits';
import { useAuditTasks, useUpdateAuditTask } from '@/hooks/useAuditTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  Users,
  User,
  FileText,
  CalendarPlus,
  ChevronRight
} from 'lucide-react';
import { exportAuditToCalendar } from '@/lib/calendarExport';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AuditTask } from '@/types/audit';
import { AUDIT_TYPE_LABELS, AUDIT_STATUS_CONFIG, TASK_STATUS_CONFIG } from '@/lib/constants';
import { isOverdue } from '@/lib/dateUtils';
import { DbAuditTask } from '@/hooks/useAuditTasks';

const StatusIcon = {
  scheduled: Clock,
  'in-progress': AlertCircle,
  completed: CheckCircle2,
  cancelled: AlertCircle,
};

interface TaskItemProps {
  task: DbAuditTask;
  index: number;
  onToggle: (taskId: string, currentStatus: string) => void;
  isUpdating: boolean;
}

const TaskItem = memo(({ task, index, onToggle, isUpdating }: TaskItemProps) => {
  const dueDate = new Date(task.due_date);
  const taskOverdue = task.status !== 'completed' && isOverdue(dueDate);
  const displayStatus = taskOverdue ? TASK_STATUS_CONFIG.overdue : TASK_STATUS_CONFIG[task.status];
  
  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={() => onToggle(task.id, task.status)}
        disabled={isUpdating}
        className="mt-1"
      />
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className={cn(
              "font-medium",
              task.status === 'completed' && "line-through text-muted-foreground"
            )}>
              {index + 1}. {task.title}
            </p>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {task.description}
              </p>
            )}
          </div>
          <Badge 
            variant="outline"
            className={cn(displayStatus.bg, displayStatus.color)}
          >
            {displayStatus.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(dueDate, 'dd.MM.yyyy', { locale: de })}
          </div>
          {task.assigned_to && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assigned_to}
            </div>
          )}
          {task.completed_at && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Abgeschlossen: {format(new Date(task.completed_at), 'dd.MM.yyyy', { locale: de })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

const AuditDetailSkeleton = () => (
  <Layout>
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="flex-1">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  </Layout>
);

const AuditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: audit, isLoading: auditLoading } = useAudit(id || '');
  const { data: tasks = [], isLoading: tasksLoading } = useAuditTasks(id);
  const updateTask = useUpdateAuditTask();
  
  const [notes, setNotes] = useState('');

  // Update notes when audit loads
  useMemo(() => {
    if (audit?.notes) {
      setNotes(audit.notes);
    }
  }, [audit?.notes]);

  const toggleTaskStatus = useCallback((taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({
      id: taskId,
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  }, [updateTask]);

  const handleExportCalendar = useCallback(() => {
    if (audit) {
      const localAudit = {
        id: audit.id,
        clientId: audit.client_id,
        clientName: audit.clients?.name || 'Unbekannt',
        type: audit.type,
        certifications: (audit.certifications || []) as any,
        scheduledDate: new Date(audit.scheduled_date),
        status: audit.status,
        tasks: [],
        notes: audit.notes || undefined,
        createdAt: new Date(audit.created_at),
      };
      exportAuditToCalendar(localAudit);
      toast({
        title: "Kalenderexport",
        description: "ICS-Datei wurde heruntergeladen. Öffnen Sie diese, um den Termin in Outlook zu importieren.",
      });
    }
  }, [audit]);

  if (auditLoading || tasksLoading) {
    return <AuditDetailSkeleton />;
  }

  if (!audit) {
    return (
      <Layout>
        <div className="p-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Audit nicht gefunden</p>
            <Button onClick={() => navigate('/audits')} className="mt-4">
              Zurück zu Audits
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const statusInfo = AUDIT_STATUS_CONFIG[audit.status];
  const Icon = StatusIcon[audit.status];
  
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/clients')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Users className="h-4 w-4 mr-1" />
              Kunden
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/clients/${audit.client_id}`)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Building2 className="h-4 w-4 mr-1" />
              {audit.clients?.name || 'Unbekannt'}
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{AUDIT_TYPE_LABELS[audit.type]}</h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(audit.scheduled_date), 'dd. MMMM yyyy', { locale: de })}
            </p>
          </div>
          <Badge 
            variant={statusInfo.variant}
            className={cn('flex items-center gap-1 text-sm px-4 py-2', statusInfo.className)}
          >
            <Icon className="h-4 w-4" />
            {statusInfo.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle>Fortschritt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">
                    {completedTasks} / {totalTasks}
                  </span>
                  <span className="text-sm text-muted-foreground">Aufgaben abgeschlossen</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tasks Card */}
            <Card>
              <CardHeader>
                <CardTitle>Aufgaben</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Keine Aufgaben definiert
                  </p>
                ) : (
                  tasks.map((task, index) => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      index={index} 
                      onToggle={toggleTaskStatus}
                      isUpdating={updateTask.isPending}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Notes Card */}
            <Card>
              <CardHeader>
                <CardTitle>Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notizen zum Audit hinzufügen..."
                  className="min-h-32"
                />
                <Button className="mt-4">Notizen speichern</Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Audit Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Audit-Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground font-medium">{audit.clients?.name || 'Unbekannt'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {format(new Date(audit.scheduled_date), 'dd. MMMM yyyy', { locale: de })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{AUDIT_TYPE_LABELS[audit.type]}</span>
                  </div>
                </div>

                {/* Show certification from client_certification link (preferred) or legacy array */}
                {audit.client_certifications?.certifications ? (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Zertifizierung
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {audit.client_certifications.certifications.name}
                      </Badge>
                    </div>
                  </div>
                ) : audit.certifications && audit.certifications.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Zertifizierungen
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {audit.certifications.map((cert) => (
                        <Badge key={cert} variant="secondary">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Erstellt am
                  </p>
                  <p className="text-sm text-foreground">
                    {format(new Date(audit.created_at), 'dd. MMMM yyyy', { locale: de })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Aktionen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleExportCalendar}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Zu Outlook hinzufügen
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Audit bearbeiten
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Bericht generieren
                </Button>
                <Button variant="outline" className="w-full justify-start text-destructive">
                  Audit abbrechen
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AuditDetail;
