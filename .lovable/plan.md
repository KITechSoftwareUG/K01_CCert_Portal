

# Mehrere Verbesserungen: Status-Badges, Audit-Filter, Inaktive Kunden, Aufgaben-Datumsanpassung

## Zusammenfassung

5 Aenderungen in einem Schritt:

1. **Zertifikats-Status immer farbig** — suspended orange, expired rot, valid/active gruen (ueberall konsistent)
2. **Audit-Uebersicht: Filter nach aktiv/inaktiv und Berater**
3. **Abgelaufene/inaktive Zertifizierungen sichtbar beim Kunden** (in der Clients-Liste)
4. **Inaktive Kunden aus Audit-Liste ausblenden** (z.B. DML Invest)
5. **Aufgaben-Fristen verschieben wenn Auditdatum geaendert wird**

---

## Aenderungen

### 1. Zertifikats-Status-Badge konsistent farbig machen

**Dateien:** `src/pages/CertificationDetail.tsx`, `src/pages/ClientDetail.tsx`, `src/pages/Clients.tsx`

Die `getStatusBadge`-Funktion und die inline `statusColors`-Maps existieren schon mit korrekten Farben. Anpassung in `CertificationDetail.tsx`: Die `getStatusBadge`-Funktion nutzt aktuell generische `variant`-Werte statt die definierten Farben aus `STATUS_OPTIONS`. Aendern auf explizite Tailwind-Klassen (gruen/orange/rot) wie in den anderen Dateien.

### 2. Audit-Uebersicht: Filter nach aktiven/inaktiven Kunden und Berater

**Datei:** `src/pages/Audits.tsx`

- Neuen State `clientStatusFilter` (`'all' | 'active' | 'inactive'`) hinzufuegen
- Neuen State `consultantFilter` (string) hinzufuegen
- `useClients()` importieren um auf `is_active` und `consultant` der Kunden zuzugreifen
- In `filteredAudits` die neuen Filter anwenden: `is_active`-Check ueber den zugehoerigen Client, Berater-Abgleich
- Zwei neue Select-Dropdowns in der Filter-Leiste rendern

### 3. Abgelaufene Zertifizierungen in der Kunden-Liste sichtbar machen

**Datei:** `src/pages/Clients.tsx`

Die Status-Badges werden bereits angezeigt (Zeilen 281-296) mit korrekten Farben. Sie werden aber nur gerendert wenn ein Status vorhanden ist. Zusaetzlich: Wenn ein Zertifikat `expired` oder `suspended` ist, soll die ganze Zeile optisch hervorgehoben werden (z.B. leicht roter/oranger Hintergrund oder ein Warnsymbol).

### 4. Inaktive Kunden aus Audit-Liste ausblenden

**Datei:** `src/pages/Audits.tsx`

- In der `filteredAudits`-Logik pruefen ob `dbAudit.clients?.is_active === false` — diese standardmaessig ausfiltern
- Der neue `clientStatusFilter` steuert ob inaktive Kunden angezeigt werden oder nicht (Standard: nur aktive)

### 5. Aufgaben-Fristen verschieben bei Auditdatum-Aenderung

**Datei:** `src/components/EditAuditDialog.tsx`

- `useAuditTasks(audit.id)` und `useUpdateAuditTask()` importieren
- In `handleSave`: Wenn sich `scheduledDate` gegenueber dem Original-Datum geaendert hat:
  - Differenz in Tagen berechnen (`newDate - oldDate`)
  - Alle Tasks des Audits laden, deren `due_date` um die gleiche Differenz verschieben
  - Batch-Update aller Tasks mit neuem `due_date`
- Toast-Nachricht ergaenzen: "Audit und X Aufgaben-Fristen aktualisiert"

---

## Technische Details

- Keine Datenbank-Aenderungen noetig
- Dateien die geaendert werden:
  1. `src/pages/CertificationDetail.tsx` — Badge-Farben
  2. `src/pages/Audits.tsx` — Zwei neue Filter + inaktive Kunden ausblenden
  3. `src/pages/Clients.tsx` — Expired/suspended Zertifikate hervorheben
  4. `src/components/EditAuditDialog.tsx` — Tasks-Fristen mitverschieben

