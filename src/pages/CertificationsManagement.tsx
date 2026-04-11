import { useState } from 'react';
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern');
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Löschen');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingCertification(null);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 bg-card/50 p-4 rounded-2xl border border-border/40 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Systeme</h1>
            <p className="text-muted-foreground text-sm font-medium mt-1">
              Verwalten Sie die verfügbaren Managementsysteme
            </p>
          </div>
          <Button size="lg" onClick={openCreateDialog} className="w-full sm:w-auto shadow-sm">
            <Plus className="h-5 w-5 mr-2" />
            Neues System
          </Button>
        </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
              </div>
            ) : certifications && certifications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certifications.map((cert) => (
                  <Card key={cert.id} className="group border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/20 bg-card/40 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="p-4 pb-2 space-y-0 flex flex-row items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary mb-2 shadow-inner">
                        <Award className="h-5 w-5" />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          onClick={() => openEditDialog(cert)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => openDeleteDialog(cert)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <h4 className="font-bold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">{cert.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3rem]">
                        {cert.description || <span className="italic opacity-50">Keine Beschreibung</span>}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Award className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Keine Systeme</h3>
                  <p className="text-sm text-muted-foreground max-w-[250px] mb-6">
                    Es wurden noch keine Managementsysteme im Portal angelegt.
                  </p>
                  <Button onClick={openCreateDialog} variant="outline" className="rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Erstes System anlegen
                  </Button>
                </CardContent>
              </Card>
            )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCertification ? 'System bearbeiten' : 'Neues System'}
            </DialogTitle>
            <DialogDescription>
              {editingCertification
                ? 'Ändern Sie die Details des Systems'
                : 'Erstellen Sie ein neues System'}
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
            <AlertDialogTitle>System löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das System "{deletingCertification?.name}" wirklich löschen?
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
    </>
  );
}
