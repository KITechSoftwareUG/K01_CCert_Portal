
# NKs beim Anlegen eines neuen Audits anzeigen und uebertragen

## Zusammenfassung

Beim Erstellen eines neuen Audits ueber den `CertificationAuditDialog` (also im Kontext einer bestimmten Zertifizierung eines Kunden) sollen offene Nicht-Konformitaeten (NKs) aus frueheren Audits derselben Zertifizierung angezeigt werden. Der Benutzer kann per Checkbox auswaehlen, welche NKs ins neue Audit uebernommen (kopiert) werden sollen.

## Aenderungen

### 1. CertificationAuditDialog erweitern

**Datei:** `src/components/CertificationAuditDialog.tsx`

- `useAllAuditTasks` importieren und laden
- Offene NKs filtern: `category === 'finding'` UND `status !== 'completed'` UND das zugehoerige Audit hat dieselbe `client_certification_id`
- Unterhalb des Audit-Typ-Selects ein Collapsible-Warnbanner anzeigen (wie bereits in `NewAuditDialog`), wenn offene NKs existieren
- Jede NK bekommt eine Checkbox zur Auswahl fuer die Uebernahme
- State `selectedNks: string[]` fuer die ausgewaehlten NK-IDs
- "Alle auswaehlen" / "Keine auswaehlen" Toggle-Button

### 2. NKs beim Erstellen kopieren

**Datei:** `src/components/CertificationAuditDialog.tsx` (gleiche Datei, Submit-Logik)

- Nach dem Erstellen des Audits und der Template-Tasks: fuer jede ausgewaehlte NK einen neuen `audit_task` mit `category: 'finding'` im neuen Audit erstellen
- Die kopierten Felder: `title`, `description`, `severity`, `due_date` (Frist wird beibehalten), `assigned_to`, `category: 'finding'`
- Status der Kopie wird auf `pending` gesetzt (da sie im neuen Audit erneut geprueft werden muss)
- `completed_at` wird NICHT uebernommen (ist ja offen)

### 3. NewAuditDialog ebenfalls erweitern

**Datei:** `src/components/NewAuditDialog.tsx`

- Die bestehende NK-Anzeige (Collapsible-Liste) um Checkboxen ergaenzen
- Gleiche Uebernahme-Logik wie im CertificationAuditDialog: ausgewaehlte NKs werden als neue Tasks im neuen Audit erstellt

## Technische Details

### Datenbank
- Keine Schema-Aenderungen noetig. NKs werden als neue `audit_tasks`-Eintraege mit `category: 'finding'` kopiert

### Dateien die geaendert werden

1. **`src/components/CertificationAuditDialog.tsx`**
   - Imports: `useAllAuditTasks`, `Collapsible`, `Checkbox`, `Badge`, `Alert`, Icons
   - Neuer State: `selectedNks`, `nkListOpen`
   - `useMemo` fuer `openFindings` gefiltert nach `client_certification_id`
   - Warnbanner mit Checkbox-Liste im Formular (nur bei Neu-Erstellung, nicht bei Bearbeitung)
   - Submit-Logik: ausgewaehlte NKs als neue Tasks kopieren

2. **`src/components/NewAuditDialog.tsx`**
   - Bestehende NK-Liste um Checkboxen erweitern
   - Neuer State: `selectedNks`
   - Submit-Logik: ausgewaehlte NKs als neue Tasks kopieren
