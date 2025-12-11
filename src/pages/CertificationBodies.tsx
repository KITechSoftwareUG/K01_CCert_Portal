import { useState } from 'react';
import { Plus, Building2, Pencil, Trash2, X, Check, Globe, User, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { useCertificationBodies, useCreateCertificationBody, useUpdateCertificationBody, useDeleteCertificationBody, CertificationBody } from '@/hooks/useCertificationBodies';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CertificationBodies = () => {
  const { data: bodies = [], isLoading } = useCertificationBodies();
  const createBody = useCreateCertificationBody();
  const updateBody = useUpdateCertificationBody();
  const deleteBody = useDeleteCertificationBody();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    website: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      short_name: '',
      website: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (body: CertificationBody) => {
    setEditingId(body.id);
    setIsAdding(false);
    setFormData({
      name: body.name,
      short_name: body.short_name || '',
      website: body.website || '',
      contact_person: body.contact_person || '',
      email: body.email || '',
      phone: body.phone || '',
      address: body.address || '',
      notes: body.notes || '',
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    try {
      if (isAdding) {
        await createBody.mutateAsync(formData);
        toast.success('Zertifizierungsgesellschaft erstellt');
      } else if (editingId) {
        await updateBody.mutateAsync({ id: editingId, ...formData });
        toast.success('Zertifizierungsgesellschaft aktualisiert');
      }
      handleCancel();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBody.mutateAsync(deleteId);
      toast.success('Zertifizierungsgesellschaft gelöscht');
      setDeleteId(null);
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const FormFields = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Name *
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="z.B. TÜV SÜD"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Kurzname</label>
        <Input
          value={formData.short_name}
          onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
          placeholder="z.B. TÜV"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4" /> Ansprechpartner
        </label>
        <Input
          value={formData.contact_person}
          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
          placeholder="Max Mustermann"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" /> E-Mail
        </label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="kontakt@beispiel.de"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Phone className="h-4 w-4" /> Telefon
        </label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+49 123 456789"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" /> Website
        </label>
        <Input
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://www.beispiel.de"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Adresse
        </label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Musterstraße 1, 12345 Musterstadt"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" /> Notizen
        </label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Weitere Informationen..."
          rows={2}
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zertifizierungsgesellschaften</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Zertifizierungspartner</p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Hinzufügen
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <Card className="border-primary/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Neue Zertifizierungsgesellschaft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormFields />
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={createBody.isPending}>
                <Check className="h-4 w-4 mr-2" />
                Speichern
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="grid gap-4">
        {bodies.map((body) => (
          <Card key={body.id} className={editingId === body.id ? 'border-primary/50 shadow-lg' : ''}>
            {editingId === body.id ? (
              <CardContent className="pt-6 space-y-4">
                <FormFields />
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={updateBody.isPending}>
                    <Check className="h-4 w-4 mr-2" />
                    Speichern
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Abbrechen
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{body.name}</h3>
                        {body.short_name && (
                          <span className="text-sm text-muted-foreground">({body.short_name})</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
                      {body.contact_person && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{body.contact_person}</span>
                        </div>
                      )}
                      {body.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${body.email}`} className="hover:text-primary hover:underline">
                            {body.email}
                          </a>
                        </div>
                      )}
                      {body.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${body.phone}`} className="hover:text-primary">
                            {body.phone}
                          </a>
                        </div>
                      )}
                      {body.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <a href={body.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                            {body.website}
                          </a>
                        </div>
                      )}
                      {body.address && (
                        <div className="flex items-center gap-2 text-muted-foreground md:col-span-2">
                          <MapPin className="h-4 w-4" />
                          <span>{body.address}</span>
                        </div>
                      )}
                    </div>
                    
                    {body.notes && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {body.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(body)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(body.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {bodies.length === 0 && !isAdding && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Keine Zertifizierungsgesellschaften vorhanden</p>
              <Button variant="outline" className="mt-4" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Erste hinzufügen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zertifizierungsgesellschaft löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Zuordnungen zu Kunden werden ebenfalls entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Layout>
  );
};

export default CertificationBodies;
