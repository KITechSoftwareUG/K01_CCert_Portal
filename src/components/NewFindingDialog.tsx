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
import { useCreateAuditTask, DbAuditTaskInsert } from '@/hooks/useAuditTasks';
import { useConsultants } from '@/hooks/useConsultants';

interface NewFindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
  category: 'task' | 'finding';
  defaultAssignedTo?: string;
}

const SEVERITY_OPTIONS = [
  { value: 'major', label: 'Haupt-NK' },
  { value: 'minor', label: 'Neben-NK' },
  { value: 'recommendation', label: 'Empfehlung' },
];

const NONE_VALUE = '__none__';

export const NewFindingDialog = ({ open, onOpenChange, auditId, category, defaultAssignedTo }: NewFindingDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [severity, setSeverity] = useState<string>('minor');

  const createTask = useCreateAuditTask();
  const { data: consultants = [] } = useConsultants();

  useEffect(() => {
    if (open) {
      setAssignedTo(defaultAssignedTo || '');
    }
  }, [open, defaultAssignedTo]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setAssignedTo(defaultAssignedTo || '');
    setSeverity('minor');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !dueDate) {
      toast.error('Bitte Titel und Frist ausfüllen');
      return;
    }

    try {
      await createTask.mutateAsync({
        audit_id: auditId,
        title,
        description: description || null,
        due_date: new Date(dueDate).toISOString(),
        assigned_to: assignedTo || null,
        status: 'pending',
        category,
        severity: category === 'finding' ? severity : null,
      } as DbAuditTaskInsert);

      toast.success(category === 'finding' ? 'Feststellung hinzugefügt' : 'Aufgabe hinzugefügt');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Fehler beim Erstellen');
    }
  };

  const activeConsultants = consultants.filter(c => c.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {category === 'finding' ? 'Neue Feststellung / NK' : 'Neue Aufgabe'}
          </DialogTitle>
          <DialogDescription>
            {category === 'finding'
              ? 'Nichtkonformität oder Feststellung aus dem Audit erfassen'
              : 'Neue Aufgabe für dieses Audit erstellen'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="finding-title">Titel <span className="text-destructive">*</span></Label>
            <Input
              id="finding-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={category === 'finding' ? 'z.B. Fehlende Dokumentation §4.2' : 'Aufgabentitel'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="finding-description">Beschreibung</Label>
            <Textarea
              id="finding-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details zur Feststellung..."
              className="min-h-20"
            />
          </div>

          {category === 'finding' && (
            <div className="space-y-2">
              <Label htmlFor="finding-severity">Schweregrad</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger id="finding-severity">
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
            <Label htmlFor="finding-due">Frist <span className="text-destructive">*</span></Label>
            <Input
              id="finding-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="finding-assigned">Zuständig</Label>
            <Select
              value={assignedTo || NONE_VALUE}
              onValueChange={(v) => setAssignedTo(v === NONE_VALUE ? '' : v)}
            >
              <SelectTrigger id="finding-assigned">
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
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Erstelle...' : 'Hinzufügen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
