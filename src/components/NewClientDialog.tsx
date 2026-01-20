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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateClient, useParentClients, CertificationStandard } from '@/hooks/useClients';
import { useCertificationBodies, useUpdateClientCertificationBodies } from '@/hooks/useCertificationBodies';
import { useCertifications } from '@/hooks/useCertifications';
import { useCreateClientCertification } from '@/hooks/useClientCertifications';
import { useAuditors } from '@/hooks/useAuditors';
import { Constants } from '@/integrations/supabase/types';

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

// Track certification selection with optional auditor
interface CertificationSelection {
  certificationId: string;
  auditorId: string | null;
}

export const NewClientDialog = ({ open, onOpenChange }: NewClientDialogProps) => {
  const [name, setName] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [consultant, setConsultant] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Deutschland');
  const [parentClientId, setParentClientId] = useState<string>('');
  const [selectedCertifications, setSelectedCertifications] = useState<CertificationSelection[]>([]);
  const [selectedCertBodies, setSelectedCertBodies] = useState<string[]>([]);
  
  const createClient = useCreateClient();
  const updateCertBodies = useUpdateClientCertificationBodies();
  const createClientCert = useCreateClientCertification();
  const { data: certificationBodies = [] } = useCertificationBodies();
  const { data: parentClients = [] } = useParentClients();
  const { data: certifications = [] } = useCertifications();
  const { data: auditors = [] } = useAuditors();

  const sortedParentClients = useMemo(() => 
    [...parentClients].sort((a, b) => a.name.localeCompare(b.name)),
    [parentClients]
  );

  const toggleCertification = (certId: string) => {
    setSelectedCertifications(prev => {
      const exists = prev.find(c => c.certificationId === certId);
      if (exists) {
        return prev.filter(c => c.certificationId !== certId);
      }
      return [...prev, { certificationId: certId, auditorId: null }];
    });
  };

  const updateCertificationAuditor = (certId: string, auditorId: string | null) => {
    setSelectedCertifications(prev => 
      prev.map(c => 
        c.certificationId === certId 
          ? { ...c, auditorId } 
          : c
      )
    );
  };

  const isCertificationSelected = (certId: string) => {
    return selectedCertifications.some(c => c.certificationId === certId);
  };

  const getSelectedAuditor = (certId: string) => {
    return selectedCertifications.find(c => c.certificationId === certId)?.auditorId || null;
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
    setClientNumber('');
    setConsultant('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCountry('Deutschland');
    setParentClientId('');
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
        client_number: clientNumber || null,
        consultant: consultant || null,
        contact_person: contactPerson,
        email,
        phone: phone || null,
        address: address || null,
        country,
        parent_client_id: parentClientId || null,
        certifications: [], // Legacy field, no longer used
      });
      
      // Add certification bodies
      if (selectedCertBodies.length > 0) {
        await updateCertBodies.mutateAsync({
          clientId: client.id,
          certificationBodyIds: selectedCertBodies,
        });
      }

      // Add client certifications (new system) with auditor if assigned
      for (const certSelection of selectedCertifications) {
        await createClientCert.mutateAsync({
          client_id: client.id,
          certification_id: certSelection.certificationId,
          auditor_id: certSelection.auditorId,
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
          {/* Parent Company Selection */}
          <div className="space-y-2">
            <Label htmlFor="parent">Unternehmensgruppe (optional)</Label>
            <Select value={parentClientId || "none"} onValueChange={(val) => setParentClientId(val === "none" ? "" : val)}>
              <SelectTrigger id="parent">
                <SelectValue placeholder="Keine Gruppe (eigenständig)" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="none">Keine Gruppe (eigenständig)</SelectItem>
                {sortedParentClients.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Wählen Sie eine Unternehmensgruppe, wenn dieser Kunde zu einem Konzern gehört
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Company Name */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Firmenname *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. REUSS Energie GmbH"
              />
            </div>

            {/* Client Number */}
            <div className="space-y-2">
              <Label htmlFor="client-number">KD-Nr.</Label>
              <Input
                id="client-number"
                value={clientNumber}
                onChange={(e) => setClientNumber(e.target.value)}
                placeholder="z.B. 02"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Consultant */}
            <div className="space-y-2">
              <Label htmlFor="consultant">Berater</Label>
              <Input
                id="consultant"
                value={consultant}
                onChange={(e) => setConsultant(e.target.value)}
                placeholder="z.B. JP"
              />
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

          {/* Certifications (New System) with Auditor Selection */}
          <div className="space-y-2">
            <Label>Zertifizierungen</Label>
            <div className="space-y-3 p-4 border rounded-lg">
              {certifications.map((cert) => {
                const isSelected = isCertificationSelected(cert.id);
                const selectedAuditor = getSelectedAuditor(cert.id);
                
                return (
                  <div key={cert.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`cert-${cert.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleCertification(cert.id)}
                      />
                      <label
                        htmlFor={`cert-${cert.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {cert.name}
                      </label>
                    </div>
                    {/* Auditor selection appears when certification is selected */}
                    {isSelected && (
                      <div className="ml-6 flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Auditor:</Label>
                        <Select 
                          value={selectedAuditor || "none"} 
                          onValueChange={(val) => updateCertificationAuditor(cert.id, val === "none" ? null : val)}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder="Kein Auditor" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            <SelectItem value="none">Kein Auditor</SelectItem>
                            {auditors.map((auditor) => (
                              <SelectItem key={auditor.id} value={auditor.id}>
                                {auditor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
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
