import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useBulkCreateClients, useParentClients, useCreateClient, DbClientInsert } from '@/hooks/useClients';
import { useCertifications } from '@/hooks/useCertifications';
import { useCertificationBodies } from '@/hooks/useCertificationBodies';
import { useAuditors, useCreateAuditor } from '@/hooks/useAuditors';
import { useCreateClientCertification } from '@/hooks/useClientCertifications';
import { useCreateAudit } from '@/hooks/useAudits';
import { useConsultants } from '@/hooks/useConsultants';
import { ClipboardPaste, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Expected columns from Excel copy-paste (tab-separated)
// Unternehmensgruppe | Name | KD-Nr. | Land | Berater | Faktor | MT | CB | Zertifikat | Auditor | Zertifikat gültig von | Zertifikat gültig bis | Audit Art
interface ParsedRow {
  groupName: string;
  clientName: string;
  clientNumber: string;
  country: string;
  consultant: string;
  factor: string;
  manDays: string;
  certBody: string;
  certification: string;
  auditor: string;
  validFrom: string;
  validUntil: string;
  auditType: string;
  // Computed
  isValid: boolean;
  errors: string[];
}

const COLUMN_HEADERS = [
  'Unternehmensgruppe',
  'Name',
  'KD-Nr.',
  'Land',
  'Berater',
  'Faktor',
  'MT',
  'CB',
  'Zertifikat',
  'Auditor',
  'gültig von',
  'gültig bis',
  'Audit Art',
];

const AUDIT_TYPE_MAP: Record<string, 'initial' | 'surveillance' | 'recertification' | 'six-month'> = {
  'erst': 'initial',
  'initial': 'initial',
  'erstaudit': 'initial',
  'überwachung': 'surveillance',
  'surveillance': 'surveillance',
  'überw': 'surveillance',
  'üa': 'surveillance',
  'rezertifizierung': 'recertification',
  'recertification': 'recertification',
  'rezert': 'recertification',
  're': 'recertification',
  '6-monat': 'six-month',
  '6m': 'six-month',
  'six-month': 'six-month',
};

export const ExcelImportDialog = ({ open, onOpenChange }: ExcelImportDialogProps) => {
  const [step, setStep] = useState<'paste' | 'preview' | 'importing'>('paste');
  const [pastedData, setPastedData] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  
  const createClient = useCreateClient();
  const createClientCert = useCreateClientCertification();
  const createAudit = useCreateAudit();
  const createAuditor = useCreateAuditor();
  
  const { data: parentClients = [] } = useParentClients();
  const { data: certifications = [] } = useCertifications();
  const { data: certBodies = [] } = useCertificationBodies();
  const { data: auditors = [] } = useAuditors();
  const { data: consultants = [] } = useConsultants();

  const parseData = () => {
    if (!pastedData.trim()) {
      toast.error('Bitte fügen Sie Daten ein');
      return;
    }

    const lines = pastedData.trim().split('\n');
    const rows: ParsedRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by tab (Excel copy uses tabs)
      const cells = line.split('\t');
      
      // Skip header row if detected
      if (i === 0 && (
        cells[0]?.toLowerCase().includes('gruppe') ||
        cells[1]?.toLowerCase() === 'name' ||
        cells[0]?.toLowerCase() === 'unternehmensgruppe'
      )) {
        continue;
      }

      const errors: string[] = [];
      const clientName = cells[1]?.trim() || '';
      const certification = cells[8]?.trim() || '';

      if (!clientName) errors.push('Name fehlt');
      
      rows.push({
        groupName: cells[0]?.trim() || '',
        clientName,
        clientNumber: cells[2]?.trim() || '',
        country: cells[3]?.trim() || 'Deutschland',
        consultant: cells[4]?.trim() || '',
        factor: cells[5]?.trim() || '',
        manDays: cells[6]?.trim() || '',
        certBody: cells[7]?.trim() || '',
        certification,
        auditor: cells[9]?.trim() || '',
        validFrom: cells[10]?.trim() || '',
        validUntil: cells[11]?.trim() || '',
        auditType: cells[12]?.trim() || '',
        isValid: errors.length === 0 && !!clientName,
        errors,
      });
    }

    if (rows.length === 0) {
      toast.error('Keine gültigen Daten gefunden');
      return;
    }

    setParsedRows(rows);
    setStep('preview');
    toast.success(`${rows.length} Zeilen erkannt`);
  };

  // Group rows by client for display
  const groupedPreview = useMemo(() => {
    const groups: Record<string, { 
      groupName: string; 
      clients: Record<string, { 
        clientName: string; 
        clientNumber: string;
        country: string;
        consultant: string;
        certs: ParsedRow[] 
      }> 
    }> = {};

    parsedRows.forEach(row => {
      const gKey = row.groupName || '__standalone__';
      if (!groups[gKey]) {
        groups[gKey] = { groupName: row.groupName, clients: {} };
      }
      
      const cKey = row.clientName;
      if (!groups[gKey].clients[cKey]) {
        groups[gKey].clients[cKey] = {
          clientName: row.clientName,
          clientNumber: row.clientNumber,
          country: row.country,
          consultant: row.consultant,
          certs: [],
        };
      }
      
      groups[gKey].clients[cKey].certs.push(row);
    });

    return groups;
  }, [parsedRows]);

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Try DD.MM.YYYY format
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try to parse as date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  };

  const performImport = async () => {
    setStep('importing');
    setImportProgress(0);

    try {
      // Step 1: Create parent groups that don't exist
      const existingGroups = new Map(parentClients.map(p => [p.name.toLowerCase(), p.id]));
      const groupsToCreate = new Set<string>();
      
      parsedRows.forEach(row => {
        if (row.groupName && !existingGroups.has(row.groupName.toLowerCase())) {
          groupsToCreate.add(row.groupName);
        }
      });

      const createdGroups = new Map<string, string>();
      for (const groupName of groupsToCreate) {
        const result = await createClient.mutateAsync({
          name: groupName,
          contact_person: `${groupName} Gruppe`,
          email: `info@${groupName.toLowerCase().replace(/\s+/g, '')}.de`,
          country: 'Deutschland',
        });
        createdGroups.set(groupName.toLowerCase(), result.id);
      }

      setImportProgress(10);

      // Merge with existing
      const allGroups = new Map([...existingGroups, ...createdGroups]);

      // Step 2: Create clients (deduplicated by name within each group)
      const clientsToCreate: Array<{
        groupName: string;
        clientName: string;
        clientNumber: string;
        country: string;
        consultant: string;
        certRows: ParsedRow[];
      }> = [];

      Object.values(groupedPreview).forEach(group => {
        Object.values(group.clients).forEach(client => {
          clientsToCreate.push({
            groupName: group.groupName,
            clientName: client.clientName,
            clientNumber: client.clientNumber,
            country: client.country,
            consultant: client.consultant,
            certRows: client.certs,
          });
        });
      });

      const createdClientIds = new Map<string, string>();
      
      for (let i = 0; i < clientsToCreate.length; i++) {
        const c = clientsToCreate[i];
        const parentId = c.groupName ? allGroups.get(c.groupName.toLowerCase()) || null : null;

        const matchedConsultant = c.consultant
          ? consultants.find(con => con.name.toLowerCase() === c.consultant.toLowerCase())
          : null;
        const clientData: DbClientInsert = {
          name: c.clientName,
          contact_person: c.consultant || c.clientName,
          email: `kontakt@${c.clientName.toLowerCase().replace(/\s+/g, '-')}.de`,
          country: c.country || 'Deutschland',
          client_number: c.clientNumber || null,
          consultant: c.consultant || null,
          consultant_id: matchedConsultant?.id || null,
          parent_client_id: parentId,
        };

        const result = await createClient.mutateAsync(clientData);
        createdClientIds.set(c.clientName.toLowerCase(), result.id);

        setImportProgress(10 + Math.round((i / clientsToCreate.length) * 40));
      }

      // Step 3: Create auditors that don't exist
      const existingAuditors = new Map(auditors.map(a => [a.name.toLowerCase(), a.id]));
      const auditorsToCreate = new Set<string>();
      
      parsedRows.forEach(row => {
        if (row.auditor && !existingAuditors.has(row.auditor.toLowerCase())) {
          auditorsToCreate.add(row.auditor);
        }
      });

      const createdAuditorIds = new Map<string, string>();
      for (const auditorName of auditorsToCreate) {
        const result = await createAuditor.mutateAsync({ name: auditorName });
        createdAuditorIds.set(auditorName.toLowerCase(), result.id);
      }

      const allAuditors = new Map([...existingAuditors, ...createdAuditorIds]);

      setImportProgress(55);

      // Step 4: Create certifications for each client
      const certMap = new Map(certifications.map(c => [c.name.toLowerCase(), c.id]));
      const cbMap = new Map(certBodies.map(cb => [cb.name?.toLowerCase() || '', cb.id]));

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        const clientId = createdClientIds.get(row.clientName.toLowerCase());
        if (!clientId) continue;

        // Find certification
        const certId = certMap.get(row.certification.toLowerCase()) ||
          [...certMap.entries()].find(([k]) => k.includes(row.certification.toLowerCase()))?.[1];

        if (certId) {
          // Create client certification
          const clientCert = await createClientCert.mutateAsync({
            client_id: clientId,
            certification_id: certId,
            valid_from: parseDate(row.validFrom),
            valid_until: parseDate(row.validUntil),
          });

          // Create audit if we have audit type
          if (row.auditType) {
            const auditTypeLower = row.auditType.toLowerCase();
            const mappedType = Object.entries(AUDIT_TYPE_MAP).find(([k]) => 
              auditTypeLower.includes(k)
            )?.[1] || 'surveillance';

            const auditorId = row.auditor ? allAuditors.get(row.auditor.toLowerCase()) || null : null;
            const cbId = row.certBody ? 
              cbMap.get(row.certBody.toLowerCase()) ||
              [...cbMap.entries()].find(([k]) => k.includes(row.certBody.toLowerCase()))?.[1] || null
              : null;

            await createAudit.mutateAsync({
              client_id: clientId,
              client_certification_id: clientCert.id,
              type: mappedType,
              scheduled_date: parseDate(row.validUntil) || new Date().toISOString(),
              status: 'scheduled',
              auditor_id: auditorId,
              certification_body_id: cbId,
            });
          }
        }

        setImportProgress(55 + Math.round((i / parsedRows.length) * 45));
      }

      setImportProgress(100);
      toast.success(`Import abgeschlossen: ${clientsToCreate.length} Kunden, ${parsedRows.length} Zertifizierungen`);

      setTimeout(() => {
        onOpenChange(false);
        resetDialog();
      }, 1500);

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Import: ' + (error as Error).message);
      setStep('preview');
    }
  };

  const resetDialog = () => {
    setStep('paste');
    setPastedData('');
    setParsedRows([]);
    setImportProgress(0);
  };

  const validRows = parsedRows.filter(r => r.isValid);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetDialog(); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Excel-Daten importieren
          </DialogTitle>
          <DialogDescription>
            {step === 'paste' && 'Kopieren Sie die Daten aus Excel und fügen Sie sie hier ein (Strg+V)'}
            {step === 'preview' && 'Überprüfen Sie die zu importierenden Daten'}
            {step === 'importing' && 'Import läuft...'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Paste */}
          {step === 'paste' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong>Erwartete Spalten (Tab-getrennt aus Excel):</strong>
                <div className="flex flex-wrap gap-1 mt-2">
                  {COLUMN_HEADERS.map((h, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{h}</Badge>
                  ))}
                </div>
              </div>
              
              <Textarea
                placeholder="Excel-Daten hier einfügen (Strg+V)..."
                className="min-h-[300px] font-mono text-sm"
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
              />

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                <Button onClick={parseData} disabled={!pastedData.trim()}>
                  Daten analysieren
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{validRows.length} gültige Zeilen</span>
                </div>
                {parsedRows.length - validRows.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{parsedRows.length - validRows.length} mit Problemen</span>
                  </div>
                )}
              </div>

              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gruppe</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>KD-Nr.</TableHead>
                      <TableHead>Berater</TableHead>
                      <TableHead>Zertifikat</TableHead>
                      <TableHead>Auditor</TableHead>
                      <TableHead>gültig bis</TableHead>
                      <TableHead>Audit Art</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow key={idx} className={!row.isValid ? 'bg-destructive/10' : ''}>
                        <TableCell>
                          {row.groupName ? (
                            <Badge variant="secondary">{row.groupName}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{row.clientName || <span className="text-destructive">Fehlt</span>}</TableCell>
                        <TableCell>{row.clientNumber || <span className="text-muted-foreground italic">Auto</span>}</TableCell>
                        <TableCell>{row.consultant || '-'}</TableCell>
                        <TableCell>
                          {row.certification ? (
                            <Badge variant="outline">{row.certification}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{row.auditor || '-'}</TableCell>
                        <TableCell>{row.validUntil || '-'}</TableCell>
                        <TableCell>{row.auditType || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setStep('paste')}>
                  Zurück
                </Button>
                <Button onClick={performImport} disabled={validRows.length === 0}>
                  {Object.keys(groupedPreview).length} Gruppen / {Object.values(groupedPreview).reduce((s, g) => s + Object.keys(g.clients).length, 0)} Kunden importieren
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {importProgress < 10 && 'Erstelle Unternehmensgruppen...'}
                {importProgress >= 10 && importProgress < 55 && 'Erstelle Kunden...'}
                {importProgress >= 55 && importProgress < 100 && 'Erstelle Zertifizierungen & Audits...'}
                {importProgress >= 100 && 'Fertig!'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};