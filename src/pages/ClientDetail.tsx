import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useClient, useUpdateClient, useDeleteClient, useParentClients, CertificationStandard } from '@/hooks/useClients';
import { useCertificationBodies, useClientCertificationBodies, useUpdateClientCertificationBodies } from '@/hooks/useCertificationBodies';
import { ContactManagement } from '@/components/ContactManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Calendar,
  Globe,
  Award,
  Hash,
  UserCheck,
  Users
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
  const { data: certificationBodies = [] } = useCertificationBodies();
  const { data: clientCertBodies = [] } = useClientCertificationBodies(id);
  const updateClient = useUpdateClient();
  const updateCertBodies = useUpdateClientCertificationBodies();
  const deleteClient = useDeleteClient();
  
  const { data: parentClients = [] } = useParentClients();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [consultant, setConsultant] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Deutschland');
  const [parentClientId, setParentClientId] = useState<string>('');
  const [selectedCertifications, setSelectedCertifications] = useState<CertificationStandard[]>([]);
  const [selectedCertBodies, setSelectedCertBodies] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Filter out current client from parent options (can't be its own parent)
  const sortedParentClients = useMemo(() => 
    [...parentClients].filter(p => p.id !== id).sort((a, b) => a.name.localeCompare(b.name)),
    [parentClients, id]
  );

  // Get parent client info
  const parentClient = useMemo(() => 
    parentClients.find(p => p.id === client?.parent_client_id),
    [parentClients, client?.parent_client_id]
  );

  // Initialize form when client loads
  useEffect(() => {
    if (client) {
      setName(client.name);
      setClientNumber(client.client_number || '');
      setConsultant(client.consultant || '');
      setContactPerson(client.contact_person);
      setEmail(client.email);
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setCountry(client.country || 'Deutschland');
      setParentClientId(client.parent_client_id || '');
      setSelectedCertifications((client.certifications || []) as CertificationStandard[]);
      setIsActive((client as any).is_active !== false);
    }
  }, [client]);

  // Initialize certification bodies when loaded
  useEffect(() => {
    if (clientCertBodies.length > 0) {
      setSelectedCertBodies(clientCertBodies.map((cb: any) => cb.certification_body_id));
    }
  }, [clientCertBodies]);

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

  const handleSave = useCallback(async () => {
    if (!id || !name || !contactPerson || !email) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      await updateClient.mutateAsync({
        id,
        name,
        client_number: clientNumber || null,
        consultant: consultant || null,
        contact_person: contactPerson,
        email,
        phone: phone || null,
        address: address || null,
        country,
        parent_client_id: parentClientId || null,
        certifications: selectedCertifications,
        is_active: isActive,
      });

      await updateCertBodies.mutateAsync({
        clientId: id,
        certificationBodyIds: selectedCertBodies,
      });

      toast.success('Kunde erfolgreich aktualisiert');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Fehler beim Aktualisieren des Kunden');
    }
  }, [id, name, clientNumber, consultant, contactPerson, email, phone, address, country, parentClientId, selectedCertifications, selectedCertBodies, isActive, updateClient, updateCertBodies]);

  const handleCancel = useCallback(() => {
    if (client) {
      setName(client.name);
      setClientNumber(client.client_number || '');
      setConsultant(client.consultant || '');
      setContactPerson(client.contact_person);
      setEmail(client.email);
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setCountry(client.country || 'Deutschland');
      setParentClientId(client.parent_client_id || '');
      setSelectedCertifications((client.certifications || []) as CertificationStandard[]);
      setSelectedCertBodies(clientCertBodies.map((cb: any) => cb.certification_body_id));
      setIsActive((client as any).is_active !== false);
    }
    setIsEditing(false);
  }, [client, clientCertBodies]);

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

  // Get assigned certification body names
  const assignedCertBodyNames = clientCertBodies
    .map((cb: any) => cb.certification_bodies?.name || cb.certification_bodies?.short_name)
    .filter(Boolean);

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
              <div className="flex items-center gap-2">
                {client.client_number && (
                  <Badge variant="outline" className="font-mono text-sm">
                    KD-Nr. {client.client_number}
                  </Badge>
                )}
                <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
                {(client as any).is_active === false && (
                  <Badge variant="destructive" className="text-sm">
                    Inaktiv
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Globe className="h-4 w-4" />
                <span>{client.country || 'Nicht zugeordnet'}</span>
                {client.consultant && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <UserCheck className="h-4 w-4" />
                    <span>Berater: {client.consultant}</span>
                  </>
                )}
                <span className="text-muted-foreground/50">•</span>
                <span>Kunde seit {format(new Date(client.created_at), 'MMMM yyyy', { locale: de })}</span>
              </div>
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
                    {/* Active Status Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-0.5">
                        <Label htmlFor="is-active" className="font-medium">
                          Status
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Inaktive Kunden werden standardmäßig nicht angezeigt
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isActive ? 'text-muted-foreground' : 'font-medium text-destructive'}`}>
                          Inaktiv
                        </span>
                        <Switch
                          id="is-active"
                          checked={isActive}
                          onCheckedChange={setIsActive}
                        />
                        <span className={`text-sm ${isActive ? 'font-medium text-green-600' : 'text-muted-foreground'}`}>
                          Aktiv
                        </span>
                      </div>
                    </div>

                    {/* Parent Company Selection */}
                    <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                      <Label htmlFor="parent" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Unternehmensgruppe
                      </Label>
                      <Select
                        value={parentClientId}
                        onValueChange={(v) => setParentClientId(v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger id="parent">
                          <SelectValue placeholder="Keine Gruppe (eigenständig)" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="__none__">Keine Gruppe (eigenständig)</SelectItem>
                          {sortedParentClients.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Ordnen Sie diesen Kunden einer Unternehmensgruppe zu
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="name">Firmenname *</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Firmenname"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-number">KD-Nr.</Label>
                        <Input
                          id="client-number"
                          value={clientNumber}
                          onChange={(e) => setClientNumber(e.target.value)}
                          placeholder="z.B. 0001"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {/* Parent Company Display */}
                    {parentClient && (
                      <div 
                        className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => navigate(`/clients/${parentClient.id}`)}
                      >
                        <Users className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Unternehmensgruppe</p>
                          <p className="font-medium text-primary">{parentClient.name}</p>
                        </div>
                      </div>
                    )}
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

            {/* Contact Management Card */}
            <ContactManagement clientId={id!} isEditing={isEditing} />

            {/* Certification Bodies Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Zertifizierungsgesellschaften
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {certificationBodies.map((body) => (
                      <div key={body.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`body-edit-${body.id}`}
                          checked={selectedCertBodies.includes(body.id)}
                          onCheckedChange={() => toggleCertBody(body.id)}
                        />
                        <label
                          htmlFor={`body-edit-${body.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {body.short_name || body.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {clientCertBodies.length > 0 ? (
                      clientCertBodies.map((cb: any) => (
                        <Badge 
                          key={cb.id} 
                          variant="outline" 
                          className="text-sm px-3 py-1 cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => navigate('/certification-bodies')}
                        >
                          {cb.certification_bodies?.short_name || cb.certification_bodies?.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Keine Zertifizierungsgesellschaften zugeordnet</p>
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
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Land:</span>
                  <span className="font-medium">{client.country || 'Nicht zugeordnet'}</span>
                </div>
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
