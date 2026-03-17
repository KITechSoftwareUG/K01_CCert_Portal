import { useState, useCallback, useEffect, memo, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAudit, useUpdateAudit, useDeleteAudit } from '@/hooks/useAudits';
import { useAuditTasks, useUpdateAuditTask, useDeleteAuditTask } from '@/hooks/useAuditTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  ChevronRight,
  Pencil,
  XCircle,
  Plus,
  AlertTriangle,
  Trash2,
  CalendarDays
} from 'lucide-react';
import { exportAuditToCalendar } from '@/lib/calendarExport';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AuditTask } from '@/types/audit';
import { AUDIT_TYPE_LABELS, AUDIT_STATUS_CONFIG, TASK_STATUS_CONFIG } from '@/lib/constants';
import { isOverdue } from '@/lib/dateUtils';
import { DbAuditTask } from '@/hooks/useAuditTasks';
import { EditAuditDialog } from '@/components/EditAuditDialog';
import { NewFindingDialog } from '@/components/NewFindingDialog';
import { EditFindingDialog } from '@/components/EditFindingDialog';
import { FindingsCsvUpload } from '@/components/FindingsCsvUpload';

const StatusIcon = {
  scheduled: Clock,
  'in-progress': AlertCircle,
  completed: CheckCircle2,
  cancelled: AlertCircle,
};

const SEVERITY_LABELS: Record<string, string> = {
  major: 'Haupt-NK',
  minor: 'Neben-NK',
  recommendation: 'Empfehlung',
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const SEVERITY_COLORS: Record<string, string> = {
  major: 'bg-red-100 text-red-800 border-red-300',
  minor: 'bg-orange-100 text-orange-800 border-orange-300',
  recommendation: 'bg-blue-100 text-blue-800 border-blue-300',
};

interface TaskItemProps {
  task: DbAuditTask & { category?: string; severity?: string | null };
  index: number;
  onToggle: (taskId: string, currentStatus: string) => void;
  onDelete: (taskId: string) => void;
  onEdit?: (task: DbAuditTask) => void;
  onSetCompletedAt?: (taskId: string, date: Date) => void;
  isUpdating: boolean;
  showSeverity?: boolean;
}

const TaskItem = memo(({ task, index, onToggle, onDelete, onEdit, onSetCompletedAt, isUpdating, showSeverity }: TaskItemProps) => {
  const dueDate = new Date(task.due_date);
  const taskOverdue = task.status !== 'completed' && isOverdue(dueDate);
  const displayStatus = taskOverdue ? TASK_STATUS_CONFIG.overdue : TASK_STATUS_CONFIG[task.status];
  const isFinding = task.category === 'finding';
  
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
          <div className="flex items-center gap-2">
            {showSeverity && task.severity && (
              <Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[task.severity] || ''}`}>
                {SEVERITY_LABELS[task.severity] || task.severity}
              </Badge>
            )}
            <Badge 
              variant="outline"
              className={cn(displayStatus.bg, displayStatus.color)}
            >
              {displayStatus.label}
            </Badge>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                title="Bearbeiten"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
              Erledigt: {format(new Date(task.completed_at), 'dd.MM.yyyy', { locale: de })}
            </div>
          )}
          {/* Date picker for findings to set manual completion date */}
          {isFinding && onSetCompletedAt && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2">
                  <CalendarDays className="h-3 w-3" />
                  {task.completed_at ? 'Datum ändern' : 'Erledigungsdatum'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={task.completed_at ? new Date(task.completed_at) : undefined}
                  onSelect={(date) => {
                    if (date) onSetCompletedAt(task.id, date);
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
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
  const { data: allItems = [], isLoading: tasksLoading } = useAuditTasks(id);
  const updateTask = useUpdateAuditTask();
  const deleteTask = useDeleteAuditTask();
  const updateAudit = useUpdateAudit();
  const deleteAudit = useDeleteAudit();
  
  const [notes, setNotes] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showNewFindingDialog, setShowNewFindingDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<DbAuditTask | null>(null);

  // Separate tasks and findings
  const tasks = useMemo(() => 
    allItems.filter((t: any) => !t.category || t.category === 'task'),
    [allItems]
  );
  
  const findings = useMemo(() => 
    allItems.filter((t: any) => t.category === 'finding'),
    [allItems]
  );

  // Update notes when audit loads
  useEffect(() => {
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

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask.mutate(taskId, {
      onSuccess: () => toast.success('Eintrag gelöscht'),
      onError: () => toast.error('Fehler beim Löschen'),
    });
  }, [deleteTask]);

  const handleSetCompletedAt = useCallback((taskId: string, date: Date) => {
    updateTask.mutate({
      id: taskId,
      completed_at: date.toISOString(),
      status: 'completed',
    }, {
      onSuccess: () => toast.success('Erledigungsdatum gesetzt'),
      onError: () => toast.error('Fehler beim Setzen des Datums'),
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
      toast.success('ICS-Datei wurde heruntergeladen. Öffnen Sie diese, um den Termin in Outlook zu importieren.');
    }
  }, [audit]);

  const handleSaveNotes = useCallback(async () => {
    if (audit && id) {
      try {
        await updateAudit.mutateAsync({ id, notes });
        toast.success('Notizen wurden aktualisiert.');
      } catch (error) {
        toast.error('Notizen konnten nicht gespeichert werden.');
      }
    }
  }, [audit, id, notes, updateAudit]);

  const handleCancelAudit = useCallback(async () => {
    if (audit && id) {
      try {
        await updateAudit.mutateAsync({ id, status: 'cancelled' });
        toast.success('Das Audit wurde als abgebrochen markiert.');
      } catch (error) {
        toast.error('Audit konnte nicht abgebrochen werden.');
      }
    }
  }, [audit, id, updateAudit]);

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

  const openFindings = findings.filter(f => f.status !== 'completed').length;

  // Get certification name for breadcrumb
  const certificationName = audit.client_certifications?.certifications?.name || 
    (audit.certifications && audit.certifications.length > 0 ? audit.certifications[0] : null);

  return (
    <Layout>
      <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 animate-fade-in">
        {/* Back Navigation + Breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button 
            variant="outline" 
            size="icon"
            className="shrink-0"
            onClick={() => navigate(-1)}
            title="Zurück"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <nav className="flex items-center text-sm text-muted-foreground overflow-x-auto">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/clients')}
              className="text-muted-foreground hover:text-foreground px-2"
            >
              Kunden
            </Button>
            <ChevronRight className="h-4 w-4 mx-1" />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/clients/${audit.client_id}`)}
              className="text-muted-foreground hover:text-foreground px-2"
            >
              {audit.clients?.name || 'Unbekannt'}
            </Button>
            {certificationName && audit.client_certification_id && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate(`/certifications/${audit.client_certification_id}`)}
                  className="text-muted-foreground hover:text-foreground px-2"
                >
                  {certificationName}
                </Button>
              </>
            )}
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="font-medium text-foreground px-2">
              {AUDIT_TYPE_LABELS[audit.type]}
            </span>
          </nav>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{AUDIT_TYPE_LABELS[audit.type]}</h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(audit.scheduled_date), 'dd.MM.yyyy', { locale: de })}
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Aufgaben</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowNewTaskDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Aufgabe
                </Button>
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
                      task={task as any} 
                      index={index} 
                      onToggle={toggleTaskStatus}
                      onDelete={handleDeleteTask}
                      onEdit={setEditingTask}
                      isUpdating={updateTask.isPending}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Findings / NK Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Feststellungen / NK</CardTitle>
                  {openFindings > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {openFindings} offen
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FindingsCsvUpload auditId={id!} />
                  <Button size="sm" variant="outline" onClick={() => setShowNewFindingDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    NK hinzufügen
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {findings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertTriangle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Keine Feststellungen erfasst</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Nichtkonformitäten und Empfehlungen aus dem Audit hier erfassen
                    </p>
                  </div>
                ) : (
                  findings.map((finding, index) => (
                    <TaskItem 
                      key={finding.id} 
                      task={finding as any} 
                      index={index} 
                      onToggle={toggleTaskStatus}
                      onDelete={handleDeleteTask}
                      onEdit={setEditingTask}
                      onSetCompletedAt={handleSetCompletedAt}
                      isUpdating={updateTask.isPending}
                      showSeverity
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
                <Button 
                  className="mt-4" 
                  onClick={handleSaveNotes}
                  disabled={updateAudit.isPending}
                >
                  {updateAudit.isPending ? 'Speichert...' : 'Notizen speichern'}
                </Button>
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
                      {format(new Date(audit.scheduled_date), 'dd.MM.yyyy', { locale: de })}
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
                    {format(new Date(audit.created_at), 'dd.MM.yyyy', { locale: de })}
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
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Audit bearbeiten
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    // Generate a printable audit report
                    const reportWindow = window.open('', '_blank');
                    if (!reportWindow) {
                      toast.error('Popup-Blocker verhindert das Öffnen des Berichts');
                      return;
                    }
                    const taskRows = tasks.map((t: any, i: number) => 
                      `<tr><td>${i+1}</td><td>${t.title}</td><td>${t.status === 'completed' ? '✅ Erledigt' : '⏳ Offen'}</td><td>${format(new Date(t.due_date), 'dd.MM.yyyy', { locale: de })}</td><td>${t.assigned_to || '-'}</td></tr>`
                    ).join('');
                    const findingRows = findings.map((f: any, i: number) => 
                      `<tr><td>${i+1}</td><td>${f.title}</td><td>${SEVERITY_LABELS[f.severity] || '-'}</td><td>${f.status === 'completed' ? '✅ Erledigt' : '⏳ Offen'}</td><td>${format(new Date(f.due_date), 'dd.MM.yyyy', { locale: de })}</td></tr>`
                    ).join('');
                    reportWindow.document.write(`<!DOCTYPE html><html><head><title>Audit-Bericht</title><style>
                      body{font-family:Arial,sans-serif;margin:40px;color:#333}
                      h1{font-size:22px;border-bottom:2px solid #333;padding-bottom:8px}
                      h2{font-size:16px;margin-top:24px;color:#555}
                      table{width:100%;border-collapse:collapse;margin-top:8px}
                      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
                      th{background:#f5f5f5;font-weight:600}
                      .meta{display:flex;gap:32px;margin:16px 0;font-size:14px}
                      .meta span{color:#666}
                      @media print{body{margin:20px}}
                    </style></head><body>
                      <h1>Audit-Bericht: ${AUDIT_TYPE_LABELS[audit.type]}</h1>
                      <div class="meta">
                        <div><span>Kunde:</span> <strong>${audit.clients?.name || 'Unbekannt'}</strong></div>
                        <div><span>Datum:</span> <strong>${format(new Date(audit.scheduled_date), 'dd.MM.yyyy', { locale: de })}</strong></div>
                        <div><span>Status:</span> <strong>${statusInfo.label}</strong></div>
                      </div>
                      ${tasks.length > 0 ? `<h2>Aufgaben (${completedTasks}/${totalTasks} erledigt)</h2>
                      <table><tr><th>#</th><th>Aufgabe</th><th>Status</th><th>Frist</th><th>Zuständig</th></tr>${taskRows}</table>` : ''}
                      ${findings.length > 0 ? `<h2>Feststellungen / NK (${openFindings} offen)</h2>
                      <table><tr><th>#</th><th>Feststellung</th><th>Schweregrad</th><th>Status</th><th>Frist</th></tr>${findingRows}</table>` : ''}
                      ${audit.notes ? `<h2>Notizen</h2><p>${audit.notes.replace(/\n/g, '<br>')}</p>` : ''}
                      <p style="margin-top:32px;font-size:11px;color:#999">Erstellt am ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                    </body></html>`);
                    reportWindow.document.close();
                    reportWindow.print();
                    toast.success('Bericht wurde generiert');
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Bericht generieren
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-destructive"
                      disabled={audit.status === 'cancelled'}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {audit.status === 'cancelled' ? 'Bereits abgebrochen' : 'Audit abbrechen'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Audit abbrechen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Möchten Sie dieses Audit wirklich abbrechen? Diese Aktion kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Nein, behalten</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelAudit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Ja, abbrechen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        <EditAuditDialog
          audit={audit}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
        <NewFindingDialog
          open={showNewTaskDialog}
          onOpenChange={setShowNewTaskDialog}
          auditId={id!}
          category="task"
        />
        <NewFindingDialog
          open={showNewFindingDialog}
          onOpenChange={setShowNewFindingDialog}
          auditId={id!}
          category="finding"
        />
        <EditFindingDialog
          open={!!editingTask}
          onOpenChange={(open) => { if (!open) setEditingTask(null); }}
          task={editingTask}
        />
      </div>
    </Layout>
  );
};

export default AuditDetail;
