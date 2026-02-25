import { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useClients, CertificationStandard } from '@/hooks/useClients';
import { useCreateAudit, AuditType } from '@/hooks/useAudits';
import { useCreateBulkAuditTasks } from '@/hooks/useAuditTasks';
import { useCertifications } from '@/hooks/useCertifications';
import { AUDIT_TYPE_LABELS } from '@/lib/constants';
import { daysFromNow } from '@/lib/dateUtils';

interface NewAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const auditTypeOptions: { value: AuditType; label: string }[] = [
  { value: 'initial', label: AUDIT_TYPE_LABELS['initial'] },
  { value: 'surveillance', label: AUDIT_TYPE_LABELS['surveillance'] },
  { value: 'recertification', label: AUDIT_TYPE_LABELS['recertification'] },
  { value: 'six-month', label: AUDIT_TYPE_LABELS['six-month'] },
  { value: 'internal', label: AUDIT_TYPE_LABELS['internal'] },
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
    internal: [
      { title: 'Internes Audit vorbereiten', description: 'Prüfplan erstellen und Dokumente zusammenstellen', dueDays: -7, assignedTo: 'Berater' },
      { title: 'Internes Audit durchführen', description: 'Interne Prüfung der Prozesse und Dokumentation durchführen', dueDays: 0, assignedTo: 'Berater' },
      { title: 'Bericht erstellen', description: 'Ergebnisse dokumentieren und Maßnahmenplan erstellen', dueDays: 7, assignedTo: 'Berater' },
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

export const NewAuditDialog = ({ open, onOpenChange }: NewAuditDialogProps) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [auditType, setAuditType] = useState<AuditType>('initial');
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');

  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: certifications = [] } = useCertifications();
  const createAudit = useCreateAudit();
  const createTasks = useCreateBulkAuditTasks();

  const sortedClients = useMemo(() => 
    [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  );

  const toggleCertification = (certName: string) => {
    setSelectedCertifications(prev =>
      prev.includes(certName)
        ? prev.filter(c => c !== certName)
        : [...prev, certName]
    );
  };

  const resetForm = () => {
    setSelectedClient('');
    setAuditType('initial');
    setSelectedCertifications([]);
    setScheduledDate('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient || !scheduledDate || selectedCertifications.length === 0) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      const audit = await createAudit.mutateAsync({
        client_id: selectedClient,
        type: auditType,
        certifications: selectedCertifications as any,
        scheduled_date: new Date(scheduledDate).toISOString(),
        notes: notes || null,
        status: 'scheduled',
      });

      // Create default tasks for the audit
      const defaultTasks = getDefaultTasksForAuditType(auditType, new Date(scheduledDate));
      await createTasks.mutateAsync(
        defaultTasks.map(task => ({
          ...task,
          audit_id: audit.id,
        }))
      );

      toast.success('Audit erfolgreich erstellt');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating audit:', error);
      toast.error('Fehler beim Erstellen des Audits');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Audit erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie ein neues Audit für einen bestehenden Kunden
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">Kunde *</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger id="client">
                <SelectValue placeholder={clientsLoading ? 'Lade Kunden...' : 'Kunde auswählen'} />
              </SelectTrigger>
              <SelectContent>
                {sortedClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audit Type */}
          <div className="space-y-2">
            <Label htmlFor="audit-type">Audit-Typ *</Label>
            <Select value={auditType} onValueChange={(value) => setAuditType(value as AuditType)}>
              <SelectTrigger id="audit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {auditTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Certifications */}
          <div className="space-y-2">
            <Label>Zertifizierungen *</Label>
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg max-h-60 overflow-y-auto">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cert-${cert.id}`}
                    checked={selectedCertifications.includes(cert.name)}
                    onCheckedChange={() => toggleCertification(cert.name)}
                  />
                  <label
                    htmlFor={`cert-${cert.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {cert.name}
                  </label>
                </div>
              ))}
            </div>
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: Zusätzliche Informationen zum Audit..."
              className="min-h-24"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={createAudit.isPending || createTasks.isPending}>
              {createAudit.isPending || createTasks.isPending ? 'Erstelle...' : 'Audit erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
