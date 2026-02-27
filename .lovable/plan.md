
# Audit-Historie: Visuelle Trennung und Zertifikat-Fix

## Aenderungen in `src/components/ClientAuditHistory.tsx`

### 1. Zwei separate Gruppen statt einer flachen Liste

Die aktuelle flache Liste wird in zwei visuell getrennte Sektionen aufgeteilt:

- **"Geplant / Laufend"** -- mit eigenem Sektions-Header, zeigt Audits mit Status `scheduled` oder `in-progress`, aufsteigend sortiert
- **"Abgeschlossen"** -- mit eigenem Sektions-Header, zeigt Audits mit Status `completed` oder `cancelled`, absteigend sortiert

Zwischen den Sektionen kommt ein `Separator` und jede Sektion erhaelt eine kleine Ueberschrift (z.B. mit Icon und Anzahl-Badge).

### 2. Zertifikat-Anzeige korrigieren

Aktuell liest die Komponente `audit.certifications` (Legacy-Enum-Array, meist leer). Da `useAudits()` jetzt den Join auf `client_certifications(certifications(*))` enthaelt, wird die Anzeige umgestellt:

- Primaer: `audit.client_certifications?.certifications?.name`
- Fallback: Legacy `audit.certifications` Array

### Technische Details

**Datei:** `src/components/ClientAuditHistory.tsx`

- `useMemo` gibt statt einem kombinierten Array zwei separate Arrays zurueck: `activeAudits` und `completedAudits`
- Rendering: Zwei Bloecke mit Sektions-Header (`CalendarClock` Icon fuer Geplant, `CheckCircle` fuer Abgeschlossen), jeweils mit Anzahl-Badge
- Import von `Separator` aus `@/components/ui/separator` und zusaetzliche Icons (`CalendarClock`, `CheckCircle2`)
- Zertifikatname-Logik in der Audit-Zeile anpassen
