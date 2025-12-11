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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateClient, CertificationStandard } from '@/hooks/useClients';
import { useCertificationBodies, useUpdateClientCertificationBodies } from '@/hooks/useCertificationBodies';
import { Constants } from '@/integrations/supabase/types';

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const certificationOptions = Constants.public.Enums.certification_standard;

const COUNTRIES = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Niederlande',
  'Belgien',
  'Frankreich',
  'Polen',
  'Tschechien',
  'Italien',
  'Spanien',
  'Vereinigtes Königreich',
  'Andere',
];

export const NewClientDialog = ({ open, onOpenChange }: NewClientDialogProps) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Deutschland');
  const [selectedCertifications, setSelectedCertifications] = useState<CertificationStandard[]>([]);
  const [selectedCertBodies, setSelectedCertBodies] = useState<string[]>([]);
  
  const createClient = useCreateClient();
  const updateCertBodies = useUpdateClientCertificationBodies();
  const { data: certificationBodies = [] } = useCertificationBodies();

  const toggleCertification = (cert: CertificationStandard) => {
    setSelectedCertifications(prev =>
      prev.includes(cert)
        ? prev.filter(c => c !== cert)
        : [...prev, cert]
    );
  };

  const toggleCertBody = (bodyId: string) => {
    setSelectedCertBodies(prev =>
      prev.includes(bodyId)
        ? prev.filter(id => id !== bodyId)
        : [...prev, bodyId]
    );
  };

  const resetForm = () => {
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCountry('Deutschland');
    setSelectedCertifications([]);
    setSelectedCertBodies([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !contactPerson || !email) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      const client = await createClient.mutateAsync({
        name,
        contact_person: contactPerson,
        email,
        phone: phone || null,
        address: address || null,
        country,
        certifications: selectedCertifications,
      });
      
      // Add certification bodies
      if (selectedCertBodies.length > 0) {
        await updateCertBodies.mutateAsync({
          clientId: client.id,
          certificationBodyIds: selectedCertBodies,
        });
      }
      
      toast.success('Kunde erfolgreich erstellt');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Fehler beim Erstellen des Kunden');
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Land *</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Land auswählen" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Label htmlFor="phone">Telefon</Label>
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
            <Label htmlFor="address">Adresse</Label>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg">
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

          {/* Certification Bodies */}
          <div className="space-y-2">
            <Label>Zertifizierungsgesellschaften</Label>
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg max-h-48 overflow-y-auto">
              {certificationBodies.map((body) => (
                <div key={body.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`body-${body.id}`}
                    checked={selectedCertBodies.includes(body.id)}
                    onCheckedChange={() => toggleCertBody(body.id)}
                  />
                  <label
                    htmlFor={`body-${body.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {body.short_name || body.name}
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
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? 'Erstelle...' : 'Kunde erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
