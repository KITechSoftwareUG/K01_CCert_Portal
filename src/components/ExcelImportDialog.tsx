import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useBulkCreateClients, useParentClients, DbClientInsert } from '@/hooks/useClients';
import { useCertifications } from '@/hooks/useCertifications';
import { useCreateClientCertification } from '@/hooks/useClientCertifications';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  name: string;
  contactPerson: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  clientNumber?: string;
  parentName?: string;
  certifications?: string[];
}

interface MappedColumn {
  excelColumn: string;
  field: keyof ParsedRow | 'skip';
}

const FIELD_OPTIONS: { value: keyof ParsedRow | 'skip'; label: string }[] = [
  { value: 'skip', label: '-- Überspringen --' },
  { value: 'name', label: 'Firmenname *' },
  { value: 'contactPerson', label: 'Ansprechpartner *' },
  { value: 'email', label: 'E-Mail *' },
  { value: 'phone', label: 'Telefon' },
  { value: 'address', label: 'Adresse' },
  { value: 'country', label: 'Land' },
  { value: 'clientNumber', label: 'Kundennummer' },
  { value: 'parentName', label: 'Unternehmensgruppe' },
  { value: 'certifications', label: 'Zertifizierungen' },
];

export const ExcelImportDialog = ({ open, onOpenChange }: ExcelImportDialogProps) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [excelData, setExcelData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<MappedColumn[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  
  const bulkCreate = useBulkCreateClients();
  const createClientCert = useCreateClientCertification();
  const { data: parentClients = [] } = useParentClients();
  const { data: certifications = [] } = useCertifications();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        
        if (jsonData.length === 0) {
          toast.error('Die Excel-Datei enthält keine Daten');
          return;
        }
        
        // Get column names from first row
        const cols = Object.keys(jsonData[0]);
        setColumns(cols);
        setExcelData(jsonData);
        
        // Auto-map columns based on common names
        const autoMappings: MappedColumn[] = cols.map(col => {
          const colLower = col.toLowerCase();
          let field: keyof ParsedRow | 'skip' = 'skip';
          
          if (colLower.includes('firma') || colLower.includes('name') || colLower.includes('unternehmen')) {
            field = 'name';
          } else if (colLower.includes('ansprech') || colLower.includes('kontakt')) {
            field = 'contactPerson';
          } else if (colLower.includes('mail')) {
            field = 'email';
          } else if (colLower.includes('telefon') || colLower.includes('phone') || colLower.includes('tel')) {
            field = 'phone';
          } else if (colLower.includes('adresse') || colLower.includes('address') || colLower.includes('straße')) {
            field = 'address';
          } else if (colLower.includes('land') || colLower.includes('country')) {
            field = 'country';
          } else if (colLower.includes('kd-nr') || colLower.includes('kundennr') || colLower.includes('nummer')) {
            field = 'clientNumber';
          } else if (colLower.includes('gruppe') || colLower.includes('parent') || colLower.includes('konzern')) {
            field = 'parentName';
          } else if (colLower.includes('zertif') || colLower.includes('cert')) {
            field = 'certifications';
          }
          
          return { excelColumn: col, field };
        });
        
        setColumnMappings(autoMappings);
        setStep('mapping');
        toast.success(`${jsonData.length} Zeilen gefunden`);
      } catch (error) {
        console.error('Excel parse error:', error);
        toast.error('Fehler beim Lesen der Excel-Datei');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const updateMapping = (excelColumn: string, field: keyof ParsedRow | 'skip') => {
    setColumnMappings(prev => 
      prev.map(m => m.excelColumn === excelColumn ? { ...m, field } : m)
    );
  };

  const processData = () => {
    const rows: ParsedRow[] = excelData.map(row => {
      const parsed: ParsedRow = {
        name: '',
        contactPerson: '',
        email: '',
      };
      
      columnMappings.forEach(mapping => {
        if (mapping.field === 'skip') return;
        const value = row[mapping.excelColumn];
        if (value !== undefined && value !== null) {
          const strValue = String(value).trim();
          switch (mapping.field) {
            case 'certifications':
              parsed.certifications = strValue.split(/[,;]/).map(c => c.trim()).filter(Boolean);
              break;
            case 'name':
              parsed.name = strValue;
              break;
            case 'contactPerson':
              parsed.contactPerson = strValue;
              break;
            case 'email':
              parsed.email = strValue;
              break;
            case 'phone':
              parsed.phone = strValue;
              break;
            case 'address':
              parsed.address = strValue;
              break;
            case 'country':
              parsed.country = strValue;
              break;
            case 'clientNumber':
              parsed.clientNumber = strValue;
              break;
            case 'parentName':
              parsed.parentName = strValue;
              break;
          }
        }
      });
      
      return parsed;
    });
    
    // Filter out invalid rows
    const validRows = rows.filter(r => r.name && r.contactPerson && r.email);
    setParsedRows(validRows);
    
    if (validRows.length < rows.length) {
      toast.warning(`${rows.length - validRows.length} Zeilen ohne Pflichtfelder werden übersprungen`);
    }
    
    setStep('preview');
  };

  const performImport = async () => {
    setStep('importing');
    setImportProgress(0);
    
    try {
      // First, find or create parent groups
      const parentNameToId: Record<string, string> = {};
      parentClients.forEach(p => {
        parentNameToId[p.name.toLowerCase()] = p.id;
      });
      
      const createdClients: Array<{ clientId: string; certNames: string[] }> = [];
      
      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        
        // Find parent ID if specified
        let parentId: string | null = null;
        if (row.parentName) {
          const parentLower = row.parentName.toLowerCase();
          parentId = parentNameToId[parentLower] || null;
        }
        
        const clientData: DbClientInsert = {
          name: row.name,
          contact_person: row.contactPerson,
          email: row.email,
          phone: row.phone || null,
          address: row.address || null,
          country: row.country || 'Deutschland',
          client_number: row.clientNumber || null,
          parent_client_id: parentId,
          certifications: [],
        };
        
        const created = await bulkCreate.mutateAsync([clientData]);
        
        if (created[0] && row.certifications && row.certifications.length > 0) {
          createdClients.push({
            clientId: created[0].id,
            certNames: row.certifications,
          });
        }
        
        setImportProgress(Math.round(((i + 1) / parsedRows.length) * 80));
      }
      
      // Now link certifications
      for (let i = 0; i < createdClients.length; i++) {
        const { clientId, certNames } = createdClients[i];
        for (const certName of certNames) {
          const cert = certifications.find(c => 
            c.name.toLowerCase() === certName.toLowerCase() ||
            c.name.toLowerCase().includes(certName.toLowerCase())
          );
          if (cert) {
            await createClientCert.mutateAsync({
              client_id: clientId,
              certification_id: cert.id,
            });
          }
        }
        setImportProgress(80 + Math.round(((i + 1) / createdClients.length) * 20));
      }
      
      setImportProgress(100);
      toast.success(`${parsedRows.length} Kunden erfolgreich importiert`);
      
      setTimeout(() => {
        onOpenChange(false);
        resetDialog();
      }, 1500);
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren');
      setStep('preview');
    }
  };

  const resetDialog = () => {
    setStep('upload');
    setExcelData([]);
    setColumns([]);
    setColumnMappings([]);
    setParsedRows([]);
    setImportProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetDialog(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel-Import
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Laden Sie eine Excel-Datei mit Kundendaten hoch'}
            {step === 'mapping' && 'Ordnen Sie die Spalten den Feldern zu'}
            {step === 'preview' && 'Überprüfen Sie die zu importierenden Daten'}
            {step === 'importing' && 'Import läuft...'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <Label htmlFor="excel-file" className="cursor-pointer">
                <span className="text-primary hover:underline">Excel-Datei auswählen</span>
                <span className="text-muted-foreground"> (.xlsx, .xls)</span>
              </Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <p className="text-xs text-muted-foreground mt-4">
                Erforderliche Spalten: Firmenname, Ansprechpartner, E-Mail
              </p>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                {columnMappings.map((mapping) => (
                  <div key={mapping.excelColumn} className="flex items-center gap-2">
                    <Badge variant="outline" className="min-w-[120px] justify-center truncate">
                      {mapping.excelColumn}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Select
                      value={mapping.field}
                      onValueChange={(v) => updateMapping(mapping.excelColumn, v as keyof ParsedRow | 'skip')}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {FIELD_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={resetDialog}>Abbrechen</Button>
                <Button onClick={processData}>
                  Weiter zur Vorschau
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  <Check className="inline h-4 w-4 text-green-500 mr-1" />
                  {parsedRows.length} gültige Einträge
                </p>
              </div>
              
              <ScrollArea className="h-[350px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Firma</TableHead>
                      <TableHead>KD-Nr.</TableHead>
                      <TableHead>Ansprechpartner</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Gruppe</TableHead>
                      <TableHead>Zertifizierungen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.clientNumber || <span className="text-muted-foreground italic">Auto</span>}</TableCell>
                        <TableCell>{row.contactPerson}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>
                          {row.parentName ? (
                            parentClients.find(p => p.name.toLowerCase() === row.parentName?.toLowerCase()) ? (
                              <Badge variant="secondary">{row.parentName}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {row.parentName}
                              </Badge>
                            )
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.certifications?.map(c => (
                            <Badge key={c} variant="outline" className="mr-1 text-xs">{c}</Badge>
                          )) || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedRows.length > 50 && (
                  <p className="text-center py-2 text-sm text-muted-foreground">
                    ... und {parsedRows.length - 50} weitere
                  </p>
                )}
              </ScrollArea>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Zurück
                </Button>
                <Button onClick={performImport} disabled={parsedRows.length === 0}>
                  {parsedRows.length} Kunden importieren
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {importProgress < 80 
                  ? `Erstelle Kunden... (${Math.round(importProgress / 80 * parsedRows.length)}/${parsedRows.length})`
                  : importProgress < 100
                    ? 'Verknüpfe Zertifizierungen...'
                    : 'Fertig!'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
