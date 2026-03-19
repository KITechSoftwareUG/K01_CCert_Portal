import { useState, useMemo } from 'react';
import { useAuditors, useCreateAuditor, useUpdateAuditor, useDeleteAuditor, AuditorWithCertificationBody } from '@/hooks/useAuditors';
import { useCertificationBodies } from '@/hooks/useCertificationBodies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, User, Building2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { formatAuditorName, sortAuditorsByLastName } from '@/lib/auditorUtils';

const Auditors = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingAuditor, setEditingAuditor] = useState<AuditorWithCertificationBody | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [certBodyId, setCertBodyId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data: auditors = [], isLoading } = useAuditors();
  const { data: certBodies = [] } = useCertificationBodies();
  const createAuditor = useCreateAuditor();
  const updateAuditor = useUpdateAuditor();
  const deleteAuditor = useDeleteAuditor();

  // Sort auditors by last name and filter by search
  const sortedAndFilteredAuditors = useMemo(() => {
    const sorted = sortAuditorsByLastName(auditors);
    return sorted.filter(auditor =>
      auditor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auditor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auditor.certification_bodies?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [auditors, searchQuery]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCertBodyId('');
    setNotes('');
    setEditingAuditor(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (auditor: AuditorWithCertificationBody) => {
    setEditingAuditor(auditor);
    setName(auditor.name);
    setEmail(auditor.email || '');
    setPhone(auditor.phone || '');
    setCertBodyId(auditor.certification_body_id || '');
    setNotes(auditor.notes || '');
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    try {
      if (editingAuditor) {
        await updateAuditor.mutateAsync({
          id: editingAuditor.id,
          name,
          email: email || null,
          phone: phone || null,
          certification_body_id: certBodyId || null,
          notes: notes || null,
        });
        toast.success('Auditor erfolgreich aktualisiert');
      } else {
        await createAuditor.mutateAsync({
          name,
          email: email || null,
          phone: phone || null,
          certification_body_id: certBodyId || null,
          notes: notes || null,
        });
        toast.success('Auditor erfolgreich erstellt');
      }
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving auditor:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAuditor.mutateAsync(id);
      toast.success('Auditor erfolgreich gelöscht');
    } catch (error) {
      console.error('Error deleting auditor:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  return (
    <>
      <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Auditoren</h1>
            <p className="text-muted-foreground text-sm">{auditors.length} Einträge</p>
          </div>
          <Button size="sm" className="sm:size-default" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Neuer Auditor</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : sortedAndFilteredAuditors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Auditoren gefunden</p>
              <Button onClick={openCreateDialog} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Ersten Auditor anlegen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Zertifizierungsstelle</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead className="w-[100px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredAuditors.map((auditor) => (
                  <TableRow key={auditor.id}>
                    <TableCell className="font-medium">{formatAuditorName(auditor.name)}</TableCell>
                    <TableCell>
                      {auditor.certification_bodies ? (
                        <Badge variant="outline" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          {auditor.certification_bodies.short_name || auditor.certification_bodies.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {auditor.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${auditor.email}`} className="hover:text-primary hover:underline">
                              {auditor.email}
                            </a>
                          </div>
                        )}
                        {auditor.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <a href={`tel:${auditor.phone}`} className="hover:text-primary hover:underline">
                              {auditor.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(auditor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Auditor löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Möchten Sie "{auditor.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(auditor.id)}>
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAuditor ? 'Auditor bearbeiten' : 'Neuer Auditor'}
              </DialogTitle>
              <DialogDescription>
                {editingAuditor ? 'Bearbeiten Sie die Auditordaten' : 'Erstellen Sie einen neuen Auditor'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Max Mustermann"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-body">Zertifizierungsstelle</Label>
                <Select
                  value={certBodyId}
                  onValueChange={(v) => setCertBodyId(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger id="cert-body">
                    <SelectValue placeholder="Zertifizierungsstelle auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Keine</SelectItem>
                    {certBodies.map((body) => (
                      <SelectItem key={body.id} value={body.id}>
                        {body.short_name || body.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="auditor@beispiel.de"
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Zusätzliche Informationen..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createAuditor.isPending || updateAuditor.isPending}>
                  {createAuditor.isPending || updateAuditor.isPending ? 'Speichert...' : 'Speichern'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Auditors;
