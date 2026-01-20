import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { 
  useCreateCertificationAudit, 
  useUpdateCertificationAudit,
  CertificationAudit,
  AuditType,
  AuditStatus
} from '@/hooks/useCertificationAudits';
import { useAuditors } from '@/hooks/useAuditors';
import { useCertificationBodies } from '@/hooks/useCertificationBodies';
import { useCreateBulkAuditTasks } from '@/hooks/useAuditTasks';
import { AUDIT_TYPE_LABELS } from '@/lib/constants';
import { daysFromNow } from '@/lib/dateUtils';
import { Constants } from '@/integrations/supabase/types';

interface CertificationAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientCertificationId: string;
  clientId: string;
  certificationName: string;
  existingAudit?: CertificationAudit | null;
}

const AUDIT_STATUS_OPTIONS: { value: AuditStatus; label: string }[] = [
  { value: 'scheduled', label: 'Geplant' },
  { value: 'in-progress', label: 'In Bearbeitung' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'cancelled', label: 'Abgebrochen' },
];

const auditTypeOptions: { value: AuditType; label: string }[] = [
  { value: 'initial', label: AUDIT_TYPE_LABELS['initial'] },
  { value: 'surveillance', label: AUDIT_TYPE_LABELS['surveillance'] },
  { value: 'recertification', label: AUDIT_TYPE_LABELS['recertification'] },
  { value: 'six-month', label: AUDIT_TYPE_LABELS['six-month'] },
];

const getDefaultTasksForAuditType = (type: AuditType, scheduledDate: Date) => {
  const taskTemplates: Record<AuditType, Array<{ title: string; description: string; dueDays: number; assignedTo: string }>> = {
    initial: [
      { title: 'Registrierung beim Zertifizierer', description: 'Registrierung beim Zertifizierer und im SURE-EU-System durchführen', dueDays: -20, assignedTo: 'Auditor' },
      { title: 'Training und Dokumentation', description: 'Schulung der Mitarbeiter durchführen und vollständige Dokumentation erstellen', dueDays: -2, assignedTo: 'Auditor' },
      { title: 'Zertifizierungsaudit und Umsetzung', description: 'Vollständiges Zertifizierungsaudit durchführen und Umsetzung der Standards prüfen', dueDays: 2, assignedTo: 'Auditor' },
    ],
    surveillance: [
      { title: 'Zusendung der Unterlagen', description: 'Alle relevanten Unterlagen für die interne Überprüfung zusenden', dueDays: 1, assignedTo: 'Auditor' },
      { title: 'Austausch und Korrektur', description: 'Feedback vom Zertifizierer besprechen und notwendige Korrekturen durchführen', dueDays: 8, assignedTo: 'Auditor' },
    ],
    recertification: [
      { title: 'Vorbereitung Re-Zertifizierung', description: 'Alle Dokumente aktualisieren und für Re-Zertifizierung vorbereiten', dueDays: 20, assignedTo: 'Auditor' },
      { title: 'Interne Überprüfung', description: 'Internes Audit zur Sicherstellung der Standards durchführen', dueDays: 35, assignedTo: 'Auditor' },
      { title: 'Re-Zertifizierungsaudit', description: 'Vollständiges Re-Zertifizierungsaudit durchführen', dueDays: 42, assignedTo: 'Auditor' },
    ],
    'six-month': [
      { title: 'Statusbericht erstellen', description: '6-Monats-Bericht über die Umsetzung der Zertifizierungsanforderungen erstellen', dueDays: 5, assignedTo: 'Auditor' },
      { title: 'Dokumentation prüfen', description: 'Vollständigkeit und Aktualität der Dokumentation überprüfen', dueDays: 15, assignedTo: 'Auditor' },
    ],
  };

  return taskTemplates[type].map((task) => ({
    title: task.title,
    description: task.description,
    due_date: daysFromNow(task.dueDays).toISOString(),
    assigned_to: task.assignedTo,
    status: 'pending' as const,
  }));
};

export const CertificationAuditDialog = ({ 
  open, 
  onOpenChange, 
  clientCertificationId,
  clientId,
  certificationName,
  existingAudit 
}: CertificationAuditDialogProps) => {
  const [auditType, setAuditType] = useState<AuditType>('initial');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState<AuditStatus>('scheduled');
  const [auditorId, setAuditorId] = useState<string>('');
  const [certificationBodyId, setCertificationBodyId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data: auditors = [] } = useAuditors();
  const { data: certificationBodies = [] } = useCertificationBodies();
  const createAudit = useCreateCertificationAudit();
  const updateAudit = useUpdateCertificationAudit();
  const createTasks = useCreateBulkAuditTasks();

  const isEditMode = !!existingAudit;

  // Initialize form when dialog opens or existingAudit changes
  useEffect(() => {
    if (existingAudit) {
      setAuditType(existingAudit.type);
      setScheduledDate(existingAudit.scheduled_date.split('T')[0]);
      setStatus(existingAudit.status);
      setAuditorId(existingAudit.auditor_id || '');
      setCertificationBodyId(existingAudit.certification_body_id || '');
      setNotes(existingAudit.notes || '');
    } else {
      resetForm();
    }
  }, [existingAudit, open]);

  const resetForm = () => {
    setAuditType('initial');
    setScheduledDate('');
    setStatus('scheduled');
    setAuditorId('');
    setCertificationBodyId('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduledDate) {
      toast.error('Bitte geben Sie ein Datum an');
      return;
    }

    try {
      if (isEditMode && existingAudit) {
        await updateAudit.mutateAsync({
          id: existingAudit.id,
          type: auditType,
          scheduled_date: new Date(scheduledDate).toISOString(),
          status,
          auditor_id: auditorId || null,
          certification_body_id: certificationBodyId || null,
          notes: notes || null,
        });
        toast.success('Audit erfolgreich aktualisiert');
      } else {
        const audit = await createAudit.mutateAsync({
          client_id: clientId,
          client_certification_id: clientCertificationId,
          type: auditType,
          scheduled_date: new Date(scheduledDate).toISOString(),
          status,
          auditor_id: auditorId || null,
          certification_body_id: certificationBodyId || null,
          notes: notes || null,
          certifications: [],
        });

        // Create default tasks for new audits
        const defaultTasks = getDefaultTasksForAuditType(auditType, new Date(scheduledDate));
        await createTasks.mutateAsync(
          defaultTasks.map(task => ({
            ...task,
            audit_id: audit.id,
          }))
        );

        toast.success('Audit erfolgreich erstellt');
      }
      
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving audit:', error);
      toast.error(isEditMode ? 'Fehler beim Aktualisieren des Audits' : 'Fehler beim Erstellen des Audits');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Audit bearbeiten' : 'Neues Audit erstellen'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? `Bearbeiten Sie das Audit für ${certificationName}` 
              : `Erstellen Sie ein neues Audit für ${certificationName}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Audit Type */}
          <div className="space-y-2">
            <Label htmlFor="audit-type">Audit-Typ *</Label>
            <Select value={auditType} onValueChange={(value) => setAuditType(value as AuditType)}>
              <SelectTrigger id="audit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {auditTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-date">Geplantes Datum *</Label>
            <Input
              id="scheduled-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as AuditStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {AUDIT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auditor */}
          <div className="space-y-2">
            <Label htmlFor="auditor">Auditor</Label>
            <Select value={auditorId || 'none'} onValueChange={(v) => setAuditorId(v === 'none' ? '' : v)}>
              <SelectTrigger id="auditor">
                <SelectValue placeholder="Auditor auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="none">Kein Auditor</SelectItem>
                {auditors.map((auditor) => (
                  <SelectItem key={auditor.id} value={auditor.id}>
                    {auditor.name}
                    {auditor.certification_bodies?.short_name && ` (${auditor.certification_bodies.short_name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Certification Body */}
          <div className="space-y-2">
            <Label htmlFor="cert-body">Zertifizierungsstelle</Label>
            <Select value={certificationBodyId || 'none'} onValueChange={(v) => setCertificationBodyId(v === 'none' ? '' : v)}>
              <SelectTrigger id="cert-body">
                <SelectValue placeholder="Zertifizierungsstelle auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="none">Keine Zertifizierungsstelle</SelectItem>
                {certificationBodies.map((body) => (
                  <SelectItem key={body.id} value={body.id}>
                    {body.short_name || body.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen zum Audit..."
              className="min-h-20"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={createAudit.isPending || updateAudit.isPending || createTasks.isPending}
            >
              {(createAudit.isPending || updateAudit.isPending || createTasks.isPending) 
                ? 'Speichert...' 
                : isEditMode ? 'Speichern' : 'Audit erstellen'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
