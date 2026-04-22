import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useUpdateAuditTask, DbAuditTask, TaskStatus } from '@/hooks/useAuditTasks';
import { useConsultants } from '@/hooks/useConsultants';
import { format } from 'date-fns';

interface EditFindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: DbAuditTask | null;
}

const SEVERITY_OPTIONS = [
  { value: 'major', label: 'Haupt-NK' },
  { value: 'minor', label: 'Neben-NK' },
  { value: 'recommendation', label: 'Empfehlung' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Offen' },
  { value: 'in-progress', label: 'In Bearbeitung' },
  { value: 'completed', label: 'Erledigt' },
];

const NONE_VALUE = '__none__';

export const EditFindingDialog = ({ open, onOpenChange, task }: EditFindingDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [severity, setSeverity] = useState<string>('minor');
  const [status, setStatus] = useState<string>('pending');

  const updateTask = useUpdateAuditTask();
  const { data: consultants = [] } = useConsultants();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '');
      setAssignedTo(task.assigned_to || '');
      setSeverity(task.severity || 'minor');
      setStatus(task.status);
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    if (!title || !dueDate) {
      toast.error('Bitte Titel und Frist ausfüllen');
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: task.id,
        title,
        description: description || null,
        due_date: new Date(dueDate).toISOString(),
        assigned_to: assignedTo || null,
        severity: task.category === 'finding' ? severity : null,
        status: status as TaskStatus,
        completed_at: status === 'completed' ? (task.completed_at || new Date().toISOString()) : null,
      });

      toast.success('Eintrag aktualisiert');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const isFinding = task?.category === 'finding';
  const activeConsultants = consultants.filter(c => c.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isFinding ? 'Feststellung bearbeiten' : 'Aufgabe bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            {isFinding
              ? 'Nichtkonformität oder Feststellung bearbeiten'
              : 'Aufgabe bearbeiten'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Titel <span className="text-destructive">*</span></Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Beschreibung</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
            />
          </div>

          {isFinding && (
            <div className="space-y-2">
              <Label htmlFor="edit-severity">Schweregrad</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger id="edit-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-due">Frist <span className="text-destructive">*</span></Label>
            <Input
              id="edit-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-assigned">Zuständig</Label>
            <Select
              value={assignedTo || NONE_VALUE}
              onValueChange={(v) => setAssignedTo(v === NONE_VALUE ? '' : v)}
            >
              <SelectTrigger id="edit-assigned">
                <SelectValue placeholder="Berater auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>— Kein Berater —</SelectItem>
                {activeConsultants.map(c => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={updateTask.isPending}>
              {updateTask.isPending ? 'Speichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
