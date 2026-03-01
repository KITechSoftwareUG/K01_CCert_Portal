
# Nicht-Konformitaeten (NK) Workflow verbessern

## Zusammenfassung

Offene Nicht-Konformitaeten aus abgeschlossenen Audits sollen bei der Planung neuer Audits sichtbar gemacht werden. Zusaetzlich wird die Anzeige offener NKs in der Kunden-Audit-Historie und im Neuen-Audit-Dialog erweitert.

## 1. Offene NKs in der Kunden-Audit-Historie anzeigen

**Datei:** `src/components/ClientAuditHistory.tsx`

- Zusaetzlich `useAllAuditTasks()` laden und nach `category = 'finding'` und `status != 'completed'` filtern
- Pro Audit in der Liste die Anzahl offener NKs als roten Badge anzeigen (z.B. "2 NK offen")
- Neue Sektion oberhalb der Audit-Liste: **"Offene Nicht-Konformitaeten"** mit Warnhinweis-Banner wenn offene NKs existieren, z.B. "Es gibt X offene NK aus frueheren Audits"

## 2. Warnung beim Erstellen eines neuen Audits

**Datei:** `src/components/NewAuditDialog.tsx`

- Wenn ein Kunde ausgewaehlt wird, offene NKs fuer diesen Kunden laden (ueber `useAllAuditTasks` gefiltert nach `client_id` des Audits)
- Wenn offene NKs existieren: Warnhinweis-Banner im Dialog anzeigen mit Anzahl und Severity-Uebersicht (z.B. "Dieser Kunde hat 2 offene Haupt-NK und 1 Neben-NK aus frueheren Audits")
- Klick auf den Hinweis klappt eine Liste der offenen NKs auf (Titel, Schweregrad, Fristdatum)

## 3. Erledigungsdatum bei NKs sicherstellen

**Datei:** `src/pages/AuditDetail.tsx`

- Die bestehende `toggleTaskStatus`-Funktion setzt bereits `completed_at` beim Abhaken -- das funktioniert also schon fuer NKs
- Zusaetzlich: Beim Klick auf eine NK ein Datepicker einblenden, um ein **manuelles Erledigungsdatum** eintragen zu koennen (nicht nur "jetzt"), da der Nachweis oft rueckwirkend erfolgt
- Dazu wird der `TaskItem`-Komponente ein optionaler "Datum eintragen"-Button hinzugefuegt (nur fuer Findings), der ein Popover mit Kalender oeffnet

## 4. NK-Fristen im Kalender -- bereits vorhanden

Die Kalender-Seite zeigt NK-Fristen bereits als orangefarbene Eintraege an und synchronisiert sie mit Outlook. Hier ist keine Aenderung noetig.

## Technische Details

### Neue Abhaengigkeiten
- Keine neuen Pakete noetig

### Dateien die geaendert werden

1. **`src/components/ClientAuditHistory.tsx`**
   - Import `useAllAuditTasks` hinzufuegen
   - Offene NKs pro Client berechnen und als Warn-Banner rendern
   - Pro Audit-Zeile NK-Count-Badge anzeigen

2. **`src/components/NewAuditDialog.tsx`**
   - Import `useAllAuditTasks` hinzufuegen
   - `openFindings` Memo berechnen wenn `selectedClient` sich aendert
   - Alert-Banner mit Collapsible-Liste der offenen NKs rendern

3. **`src/pages/AuditDetail.tsx`**
   - `TaskItem` erweitern: Fuer `category === 'finding'` einen "Erledigungsdatum"-Button mit Popover/Calendar hinzufuegen
   - `useUpdateAuditTask` aufrufen um `completed_at` mit dem gewaehlten Datum zu setzen

### Datenbank
- Keine Schema-Aenderungen noetig -- `audit_tasks.completed_at` und `audit_tasks.category`/`severity` existieren bereits
