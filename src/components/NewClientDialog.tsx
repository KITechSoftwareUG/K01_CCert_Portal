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
import { Checkbox } from '@/components/ui/checkbox';
import { CertificationStandard } from '@/types/audit';
import { toast } from 'sonner';

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const certificationOptions: CertificationStandard[] = [
  'SURE',
  'FSC',
  'PEFC',
  'ISCC',
  'ISO 9001',
  'ISO 14001',
];

export const NewClientDialog = ({ open, onOpenChange }: NewClientDialogProps) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCertifications, setSelectedCertifications] = useState<CertificationStandard[]>([]);

  const toggleCertification = (cert: CertificationStandard) => {
    setSelectedCertifications(prev =>
      prev.includes(cert)
        ? prev.filter(c => c !== cert)
        : [...prev, cert]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !contactPerson || !email || !phone || !address) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    // Here you would normally save to backend
    toast.success('Kunde erfolgreich erstellt');
    onOpenChange(false);
    
    // Reset form
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setSelectedCertifications([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Kunde</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen neuen Kundeneintrag
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Firmenname *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Holz GmbH"
            />
          </div>

          {/* Contact Person */}
          <div className="space-y-2">
            <Label htmlFor="contact-person">Ansprechpartner *</Label>
            <Input
              id="contact-person"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="z.B. Hans Müller"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kontakt@beispiel.de"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 123 456789"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straße, PLZ Ort"
            />
          </div>

          {/* Certifications */}
          <div className="space-y-2">
            <Label>Zertifizierungen</Label>
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
              {certificationOptions.map((cert) => (
                <div key={cert} className="flex items-center space-x-2">
                  <Checkbox
                    id={`client-${cert}`}
                    checked={selectedCertifications.includes(cert)}
                    onCheckedChange={() => toggleCertification(cert)}
                  />
                  <label
                    htmlFor={`client-${cert}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {cert}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit">
              Kunde erstellen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
