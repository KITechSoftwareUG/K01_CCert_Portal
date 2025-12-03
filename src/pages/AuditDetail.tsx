import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { mockAudits } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  User,
  FileText,
  CalendarPlus
} from 'lucide-react';
import { exportAuditToCalendar } from '@/lib/calendarExport';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TaskStatus } from '@/types/audit';

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

const taskStatusConfig = {
  pending: { label: 'Ausstehend', color: 'text-muted-foreground', bg: 'bg-secondary' },
  'in-progress': { label: 'In Bearbeitung', color: 'text-warning-foreground', bg: 'bg-warning' },
  completed: { label: 'Abgeschlossen', color: 'text-success-foreground', bg: 'bg-success' },
  overdue: { label: 'Überfällig', color: 'text-destructive-foreground', bg: 'bg-destructive' },
};

const AuditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const audit = mockAudits.find(a => a.id === id);
  
  const [tasks, setTasks] = useState(audit?.tasks || []);
  const [notes, setNotes] = useState(audit?.notes || '');

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

  const statusInfo = statusConfig[audit.status];
  const StatusIcon = statusInfo.icon;
  
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const toggleTaskStatus = (taskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
        return {
          ...task,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date() : undefined,
        };
      }
      return task;
    }));
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/audits')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{audit.clientName}</h1>
            <p className="text-muted-foreground">{auditTypeLabels[audit.type]}</p>
          </div>
          <Badge 
            variant={statusInfo.variant}
            className={cn(
              'flex items-center gap-1 text-sm px-4 py-2',
              audit.status === 'in-progress' && 'bg-warning text-warning-foreground',
              audit.status === 'completed' && 'bg-success text-success-foreground'
            )}
          >
            <StatusIcon className="h-4 w-4" />
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
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
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
                  tasks.map((task, index) => {
                    const taskStatusInfo = taskStatusConfig[task.status];
                    const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
                    const displayStatus = isOverdue ? taskStatusConfig.overdue : taskStatusInfo;
                    
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={() => toggleTaskStatus(task.id)}
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
                              <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                              </p>
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
                              {format(task.dueDate, 'dd.MM.yyyy', { locale: de })}
                            </div>
                            {task.assignedTo && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {task.assignedTo}
                              </div>
                            )}
                            {task.completedAt && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Abgeschlossen: {format(task.completedAt, 'dd.MM.yyyy', { locale: de })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                    <span className="text-foreground font-medium">{audit.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {format(audit.scheduledDate, 'dd. MMMM yyyy', { locale: de })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{auditTypeLabels[audit.type]}</span>
                  </div>
                </div>

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

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Erstellt am
                  </p>
                  <p className="text-sm text-foreground">
                    {format(audit.createdAt, 'dd. MMMM yyyy', { locale: de })}
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
                  onClick={() => {
                    exportAuditToCalendar(audit);
                    toast({
                      title: "Kalenderexport",
                      description: "ICS-Datei wurde heruntergeladen. Öffnen Sie diese, um den Termin in Outlook zu importieren.",
                    });
                  }}
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
