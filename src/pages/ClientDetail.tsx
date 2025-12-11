import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useClient, useUpdateClient, useDeleteClient, CertificationStandard } from '@/hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  ArrowLeft,
  Pencil,
  Save,
  X,
  Trash2,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Constants } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const certificationOptions = Constants.public.Enums.certification_standard;

const ClientDetailSkeleton = () => (
  <Layout>
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="flex-1">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </Layout>
);

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: client, isLoading } = useClient(id || '');
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCertifications, setSelectedCertifications] = useState<CertificationStandard[]>([]);

  // Initialize form when client loads
  useEffect(() => {
    if (client) {
      setName(client.name);
      setContactPerson(client.contact_person);
      setEmail(client.email);
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setSelectedCertifications((client.certifications || []) as CertificationStandard[]);
    }
  }, [client]);

  const toggleCertification = (cert: CertificationStandard) => {
    setSelectedCertifications(prev =>
      prev.includes(cert)
        ? prev.filter(c => c !== cert)
        : [...prev, cert]
    );
  };

  const handleSave = useCallback(async () => {
    if (!id || !name || !contactPerson || !email) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      await updateClient.mutateAsync({
        id,
        name,
        contact_person: contactPerson,
        email,
        phone: phone || null,
        address: address || null,
        certifications: selectedCertifications,
      });
      toast.success('Kunde erfolgreich aktualisiert');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Fehler beim Aktualisieren des Kunden');
    }
  }, [id, name, contactPerson, email, phone, address, selectedCertifications, updateClient]);

  const handleCancel = useCallback(() => {
    if (client) {
      setName(client.name);
      setContactPerson(client.contact_person);
      setEmail(client.email);
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setSelectedCertifications((client.certifications || []) as CertificationStandard[]);
    }
    setIsEditing(false);
  }, [client]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    
    try {
      await deleteClient.mutateAsync(id);
      toast.success('Kunde erfolgreich gelöscht');
      navigate('/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Fehler beim Löschen des Kunden');
    }
  }, [id, deleteClient, navigate]);

  if (isLoading) {
    return <ClientDetailSkeleton />;
  }

  if (!client) {
    return (
      <Layout>
        <div className="p-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Kunde nicht gefunden</p>
            <Button onClick={() => navigate('/clients')} className="mt-4">
              Zurück zu Kunden
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/clients')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
              <p className="text-muted-foreground">
                Kunde seit {format(new Date(client.created_at), 'MMMM yyyy', { locale: de })}
              </p>
            </div>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Bearbeiten
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="gap-2">
                <X className="h-4 w-4" />
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={updateClient.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {updateClient.isPending ? 'Speichert...' : 'Speichern'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Kontaktdaten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Firmenname *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Firmenname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-person">Ansprechpartner *</Label>
                      <Input
                        id="contact-person"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="Ansprechpartner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-Mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="E-Mail"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Telefon"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Adresse</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Adresse"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ansprechpartner</p>
                        <p className="font-medium">{client.contact_person}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">E-Mail</p>
                        <a href={`mailto:${client.email}`} className="font-medium text-primary hover:underline">
                          {client.email}
                        </a>
                      </div>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Telefon</p>
                          <a href={`tel:${client.phone}`} className="font-medium text-primary hover:underline">
                            {client.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Adresse</p>
                          <p className="font-medium">{client.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Certifications Card */}
            <Card>
              <CardHeader>
                <CardTitle>Zertifizierungen</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {certificationOptions.map((cert) => (
                      <div key={cert} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${cert}`}
                          checked={selectedCertifications.includes(cert)}
                          onCheckedChange={() => toggleCertification(cert)}
                        />
                        <label
                          htmlFor={`edit-${cert}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {cert}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {client.certifications && client.certifications.length > 0 ? (
                      client.certifications.map((cert) => (
                        <Badge key={cert} variant="secondary" className="text-sm px-3 py-1">
                          {cert}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Keine Zertifizierungen hinterlegt</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Erstellt:</span>
                  <span className="font-medium">
                    {format(new Date(client.created_at), 'dd.MM.yyyy', { locale: de })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Aktualisiert:</span>
                  <span className="font-medium">
                    {format(new Date(client.updated_at), 'dd.MM.yyyy', { locale: de })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Gefahrenzone</CardTitle>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full gap-2">
                      <Trash2 className="h-4 w-4" />
                      Kunde löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Kunde wirklich löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden. Der Kunde und alle zugehörigen Audits werden dauerhaft gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteClient.isPending ? 'Löscht...' : 'Endgültig löschen'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ClientDetail;
