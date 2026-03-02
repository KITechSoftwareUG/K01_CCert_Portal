import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateBulkAuditTasks, DbAuditTaskInsert } from '@/hooks/useAuditTasks';

interface FindingsCsvUploadProps {
  auditId: string;
}

interface ParsedFinding {
  title: string;
  description: string;
  severity: string;
  dueDate: string;
  assignedTo: string;
  valid: boolean;
  error?: string;
}

const SEVERITY_MAP: Record<string, string> = {
  'haupt': 'major',
  'haupt-nk': 'major',
  'hauptnk': 'major',
  'major': 'major',
  'neben': 'minor',
  'neben-nk': 'minor',
  'nebennk': 'minor',
  'minor': 'minor',
  'empfehlung': 'recommendation',
  'recommendation': 'recommendation',
};

const SEVERITY_LABELS: Record<string, string> = {
  major: 'Haupt-NK',
  minor: 'Neben-NK',
  recommendation: 'Empfehlung',
};

function parseSeverity(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, '-');
  return SEVERITY_MAP[key] || 'minor';
}

function parseDate(raw: string): string | null {
  if (!raw.trim()) return null;
  // Try dd.MM.yyyy
  const dotMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  // Try yyyy-MM-dd
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const date = new Date(raw);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function parseCsvLine(line: string): string[] {
  // Handle tab-separated or semicolon-separated
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  return line.split(',');
}

export const FindingsCsvUpload = ({ auditId }: FindingsCsvUploadProps) => {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedFinding[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const createBulk = useCreateBulkAuditTasks();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('Datei enthält keine Daten (mindestens Kopfzeile + 1 Zeile)');
        return;
      }

      // Skip header
      const rows = lines.slice(1);
      const findings: ParsedFinding[] = rows.map(line => {
        const cols = parseCsvLine(line);
        const title = (cols[0] || '').trim();
        const description = (cols[1] || '').trim();
        const severityRaw = (cols[2] || '').trim();
        const dueDateRaw = (cols[3] || '').trim();
        const assignedTo = (cols[4] || '').trim();

        const dueDate = parseDate(dueDateRaw);
        const severity = parseSeverity(severityRaw);

        const errors: string[] = [];
        if (!title) errors.push('Kein Titel');
        if (!dueDate) errors.push('Ungültiges Datum');

        return {
          title,
          description,
          severity,
          dueDate: dueDate || '',
          assignedTo,
          valid: errors.length === 0,
          error: errors.length > 0 ? errors.join(', ') : undefined,
        };
      });

      setParsed(findings);
      setOpen(true);
    };
    reader.readAsText(file);
    // Reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    const validFindings = parsed.filter(f => f.valid);
    if (validFindings.length === 0) {
      toast.error('Keine gültigen Einträge zum Importieren');
      return;
    }

    const tasks: DbAuditTaskInsert[] = validFindings.map(f => ({
      audit_id: auditId,
      title: f.title,
      description: f.description || null,
      severity: f.severity,
      due_date: f.dueDate,
      assigned_to: f.assignedTo || null,
      status: 'pending' as const,
      category: 'finding',
    }));

    try {
      await createBulk.mutateAsync(tasks);
      toast.success(`${validFindings.length} Feststellungen importiert`);
      setOpen(false);
      setParsed([]);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren');
    }
  };

  const validCount = parsed.filter(f => f.valid).length;
  const invalidCount = parsed.filter(f => !f.valid).length;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => fileRef.current?.click()}
        title="CSV-Datei mit NKs hochladen"
      >
        <Upload className="h-4 w-4 mr-1" />
        CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              NK-Import Vorschau
            </DialogTitle>
            <DialogDescription>
              Format: Titel; Beschreibung; Schweregrad (Haupt-NK/Neben-NK/Empfehlung); Frist (TT.MM.JJJJ); Zuständig
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 text-sm">
            <Badge variant="secondary">{validCount} gültig</Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive">{invalidCount} fehlerhaft</Badge>
            )}
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Schweregrad</TableHead>
                  <TableHead>Frist</TableHead>
                  <TableHead>Zuständig</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((f, i) => (
                  <TableRow key={i} className={f.valid ? '' : 'bg-destructive/10'}>
                    <TableCell className="font-medium max-w-[200px] truncate">{f.title || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {SEVERITY_LABELS[f.severity] || f.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{f.dueDate ? new Date(f.dueDate).toLocaleDateString('de-DE') : '—'}</TableCell>
                    <TableCell>{f.assignedTo || '—'}</TableCell>
                    <TableCell>
                      {f.valid ? (
                        <Badge variant="secondary" className="text-xs">OK</Badge>
                      ) : (
                        <div className="flex items-center gap-1 text-destructive text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          {f.error}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={handleImport} disabled={createBulk.isPending || validCount === 0}>
              {createBulk.isPending ? 'Importiere...' : `${validCount} importieren`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
