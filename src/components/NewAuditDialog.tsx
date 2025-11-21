import { useState } from 'react';
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
import { mockClients } from '@/lib/mockData';
import { AuditType, CertificationStandard } from '@/types/audit';
import { toast } from 'sonner';

interface NewAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const auditTypeOptions: { value: AuditType; label: string }[] = [
  { value: 'initial', label: 'Initialaudit' },
  { value: 'surveillance', label: 'Überwachungsaudit' },
  { value: 'recertification', label: 'Re-Zertifizierung' },
  { value: 'six-month', label: '6-Monats-Überwachung' },
];

const certificationOptions: CertificationStandard[] = [
  'SURE',
  'FSC',
  'PEFC',
  'ISCC',
  'ISO 9001',
  'ISO 14001',
];

export const NewAuditDialog = ({ open, onOpenChange }: NewAuditDialogProps) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [auditType, setAuditType] = useState<AuditType>('initial');
  const [selectedCertifications, setSelectedCertifications] = useState<CertificationStandard[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');

  const toggleCertification = (cert: CertificationStandard) => {
    setSelectedCertifications(prev =>
      prev.includes(cert)
        ? prev.filter(c => c !== cert)
        : [...prev, cert]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient || !scheduledDate || selectedCertifications.length === 0) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    // Here you would normally save to backend
    toast.success('Audit erfolgreich erstellt');
    onOpenChange(false);
    
    // Reset form
    setSelectedClient('');
    setAuditType('initial');
    setSelectedCertifications([]);
    setScheduledDate('');
    setNotes('');
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
                <SelectValue placeholder="Kunde auswählen" />
              </SelectTrigger>
              <SelectContent>
                {mockClients.map((client) => (
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
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
              {certificationOptions.map((cert) => (
                <div key={cert} className="flex items-center space-x-2">
                  <Checkbox
                    id={cert}
                    checked={selectedCertifications.includes(cert)}
                    onCheckedChange={() => toggleCertification(cert)}
                  />
                  <label
                    htmlFor={cert}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {cert}
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
            <Button type="submit">
              Audit erstellen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
