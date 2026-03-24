import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUpdateAudit, AuditWithClient } from '@/hooks/useAudits';
import { useAuditors } from '@/hooks/useAuditors';
import { useCertificationBodies } from '@/hooks/useCertificationBodies';
import { useAuditTasks, useUpdateAuditTask } from '@/hooks/useAuditTasks';
import { formatAuditorName, sortAuditorsByLastName } from '@/lib/auditorUtils';
import { toast } from 'sonner';
import { AUDIT_STATUS_CONFIG } from '@/lib/constants';
import { addDays, differenceInCalendarDays } from 'date-fns';

interface EditAuditDialogProps {
  audit: AuditWithClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AUDIT_STATUSES = [
  { value: 'scheduled', label: 'Geplant' },
  { value: 'in-progress', label: 'In Bearbeitung' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'cancelled', label: 'Abgebrochen' },
] as const;

export function EditAuditDialog({ audit, open, onOpenChange }: EditAuditDialogProps) {
  const updateAudit = useUpdateAudit();
  const { data: auditors = [] } = useAuditors();
  const { data: certificationBodies = [] } = useCertificationBodies();
  const { data: auditTasks = [] } = useAuditTasks(audit?.id);
  const updateTask = useUpdateAuditTask();

  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [originalDate, setOriginalDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<string>('scheduled');
  const [auditorId, setAuditorId] = useState<string>('__none__');
  const [certificationBodyId, setCertificationBodyId] = useState<string>('__none__');

  // Reset form only when a different audit is opened (keyed by audit.id)
  useEffect(() => {
    if (audit) {
      const d = new Date(audit.scheduled_date);
      setScheduledDate(d);
      setOriginalDate(d);
      setStatus(audit.status);
      setAuditorId(audit.auditor_id || '__none__');
      setCertificationBodyId(audit.certification_body_id || '__none__');
    }
  }, [audit?.id]);

  const sortedAuditors = sortAuditorsByLastName(auditors);

  const handleSave = async () => {
    if (!audit || !scheduledDate) {
      toast.error('Bitte wählen Sie ein Datum.');
      return;
    }

    try {
      const daysDiff = originalDate ? differenceInCalendarDays(scheduledDate, originalDate) : 0;

      await updateAudit.mutateAsync({
        id: audit.id,
        scheduled_date: scheduledDate.toISOString(),
        status: status as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
        auditor_id: auditorId === '__none__' ? null : auditorId,
        certification_body_id: certificationBodyId === '__none__' ? null : certificationBodyId,
      });

      // Shift task due dates if audit date changed
      if (daysDiff !== 0 && auditTasks.length > 0) {
        await Promise.all(
          auditTasks.map((task) =>
            updateTask.mutateAsync({
              id: task.id,
              due_date: addDays(new Date(task.due_date), daysDiff).toISOString(),
            })
          )
        );
        toast.success(`Audit und ${auditTasks.length} Aufgaben-Fristen aktualisiert.`);
      } else {
        toast.success('Audit wurde erfolgreich aktualisiert.');
      }

      onOpenChange(false);
    } catch (error) {
      toast.error('Audit konnte nicht aktualisiert werden.');
    }
  };

  if (!audit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Audit bearbeiten</DialogTitle>
          <DialogDescription>
            Ändern Sie Datum, Status und Auditor für dieses Audit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label>Auditdatum *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? (
                    format(scheduledDate, 'dd.MM.yyyy', { locale: de })
                  ) : (
                    <span>Datum wählen...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {originalDate && scheduledDate && differenceInCalendarDays(scheduledDate, originalDate) !== 0 && auditTasks.length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mt-2 flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" />
                Hinweis: {auditTasks.length} Aufgabenfristen werden automatisch um {Math.abs(differenceInCalendarDays(scheduledDate, originalDate))} Tage {differenceInCalendarDays(scheduledDate, originalDate) > 0 ? 'nach hinten' : 'nach vorne'} verschoben.
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status wählen..." />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auditor */}
          <div className="space-y-2">
            <Label>Auditor</Label>
            <Select value={auditorId} onValueChange={setAuditorId}>
              <SelectTrigger>
                <SelectValue placeholder="Auditor wählen..." />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="__none__">— Kein Auditor —</SelectItem>
                {sortedAuditors.map((auditor) => (
                  <SelectItem key={auditor.id} value={auditor.id}>
                    {formatAuditorName(auditor.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Certification Body */}
          <div className="space-y-2">
            <Label>Zertifizierer</Label>
            <Select value={certificationBodyId} onValueChange={setCertificationBodyId}>
              <SelectTrigger>
                <SelectValue placeholder="Zertifizierer wählen..." />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="__none__">— Kein Zertifizierer —</SelectItem>
                {certificationBodies.map((body) => (
                  <SelectItem key={body.id} value={body.id}>
                    {body.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={updateAudit.isPending}>
            {updateAudit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent >
    </Dialog >
  );
}
