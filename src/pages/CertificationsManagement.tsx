import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { useCertifications, DbCertification } from '@/hooks/useCertifications';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Award, Loader2 } from 'lucide-react';

type CertificationFormData = {
  name: string;
  description: string;
};

export default function CertificationsManagement() {
  const { data: certifications, isLoading } = useCertifications();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCertification, setEditingCertification] = useState<DbCertification | null>(null);
  const [deletingCertification, setDeletingCertification] = useState<DbCertification | null>(null);
  const [formData, setFormData] = useState<CertificationFormData>({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingCertification(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (cert: DbCertification) => {
    setEditingCertification(cert);
    setFormData({
      name: cert.name,
      description: cert.description || '',
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (cert: DbCertification) => {
    setDeletingCertification(cert);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCertification) {
        const { error } = await supabase
          .from('certifications')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          })
          .eq('id', editingCertification.id);

        if (error) throw error;
        toast.success('Zertifizierung aktualisiert');
      } else {
        const { error } = await supabase
          .from('certifications')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          });

        if (error) throw error;
        toast.success('Zertifizierung erstellt');
      }

      queryClient.invalidateQueries({ queryKey: ['certifications'] });
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCertification) return;

    try {
      const { error } = await supabase
        .from('certifications')
        .delete()
        .eq('id', deletingCertification.id);

      if (error) throw error;
      toast.success('Zertifizierung gelöscht');
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Löschen');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingCertification(null);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Zertifizierungen</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie die verfügbaren Zertifizierungsstandards
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Zertifizierungsstandards
              </CardTitle>
              <CardDescription>
                Liste aller verfügbaren Zertifizierungen im System
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Zertifizierung
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : certifications && certifications.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="w-[100px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certifications.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cert.description || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(cert)}
                            title="Bearbeiten"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(cert)}
                            className="text-destructive hover:text-destructive"
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Keine Zertifizierungen vorhanden. Erstellen Sie die erste Zertifizierung.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCertification ? 'Zertifizierung bearbeiten' : 'Neue Zertifizierung'}
            </DialogTitle>
            <DialogDescription>
              {editingCertification
                ? 'Ändern Sie die Details der Zertifizierung'
                : 'Erstellen Sie eine neue Zertifizierung im System'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. ISO 9001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionale Beschreibung der Zertifizierung"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCertification ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zertifizierung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Zertifizierung "{deletingCertification?.name}" wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
