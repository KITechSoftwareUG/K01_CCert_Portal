

# Plan: UI-Verbesserungen und Pflichtfeld-Anpassungen

## 1. Navigation: Zurueck-Button auf Kundendetailseite

**Datei:** `src/pages/ClientDetail.tsx`

- Der "Zurueck"-Button navigiert aktuell immer hart zu `/clients`. Stattdessen soll `navigate(-1)` verwendet werden, damit der Nutzer zum vorherigen Kontext zurueckkehrt (z.B. nach dem Anlegen eines Kunden direkt auf die Kundendetailseite, dann zurueck zur Kundenliste).
- **Hinweis:** Die Navigation nach dem Anlegen (`NewClientDialog`) leitet bereits korrekt zu `/clients/${client.id}` weiter -- das funktioniert. Das Problem ist nur der Zurueck-Button.

## 2. Kunden: Alle aufklappen / Alle zuklappen

**Datei:** `src/pages/Clients.tsx`

- Zwei neue Buttons im Header-Bereich: **"Alle aufklappen"** und **"Alle zuklappen"**
- "Alle aufklappen": Setzt `expandedCountries`, `expandedGroups` und `expandedClients` auf alle vorhandenen IDs
- "Alle zuklappen": Leert alle drei Sets
- Beide Aktionen aktualisieren auch den `sessionStorage`

## 3. Pflichtfelder mit rotem Sternchen kennzeichnen

**Dateien:** `src/pages/ClientDetail.tsx`, `src/components/NewClientDialog.tsx`, `src/components/ContactManagement.tsx`, `src/components/NewFindingDialog.tsx`

- Alle Pflichtfeld-Labels erhalten ein `<span className="text-destructive">*</span>`
- Einige Labels haben das bereits (z.B. Firmenname in NewClientDialog) -- Konsistenz sicherstellen
- **Pflichtfelder sind:** Name, Land, Berater (bei Kunden), Kundennummer (bei Kunden)

## 4. E-Mail NICHT als Pflichtfeld

**Dateien:** `src/pages/ClientDetail.tsx`

- Aktuell prueft `handleSave` auf `!email` als Pflichtfeld (Zeile 161). Diese Pruefung entfernen.
- Label aendern: `E-Mail *` wird zu `E-Mail` (ohne Stern)
- E-Mail-Feld behaelt einen Platzhalter-Text

## 5. E-Mail-Feld Placeholder anpassen

**Dateien:** `src/pages/ClientDetail.tsx`, `src/components/NewClientDialog.tsx`

- Placeholder fuer E-Mail-Felder auf `z.B. kontakt@firma.de` setzen (kein "optional" im Text, da es kein Pflichtfeld ist, aber auch kein Stern)

## 6. Einheitliche Datumsformate

Bereits weitgehend umgesetzt (`dd.MM.yyyy`). Pruefung auf verbleibende Inkonsistenzen in:
- `src/pages/AuditDetail.tsx`
- `src/pages/Clients.tsx`
- `src/components/ClientAuditHistory.tsx`
- Alle Datumsanzeigen auf `dd.MM.yyyy` mit deutschem Locale vereinheitlichen

## 7. Berichtfunktion bei Audits

**Datei:** `src/pages/AuditDetail.tsx`

- Untersuchen, was die aktuelle "Bericht"-Funktion tut und warum sie nicht funktioniert. Aktuell gibt es eine `exportAuditToCalendar`-Funktion -- pruefen ob eine separate Berichtfunktion fehlt oder fehlerhaft ist.
- Falls keine Berichtfunktion existiert: Eine einfache PDF/Druck-Export-Funktion einbauen, die die Audit-Details (Typ, Datum, Aufgaben, Feststellungen) zusammenfasst.

## 8. Gleichzeitiges Arbeiten verhindern (Locking)

**Thema fuer spaetere Besprechung** -- Dies erfordert ein Realtime-basiertes Locking-System:
- Eine `client_locks`-Tabelle mit `client_id`, `locked_by` (user_id), `locked_at`
- Beim Oeffnen eines Kunden wird ein Lock gesetzt; beim Verlassen freigegeben
- Andere Nutzer sehen "Wird aktuell von [Name] bearbeitet"
- **Empfehlung:** Dies in einem separaten Schritt nach dem naechsten Online-Termin umsetzen, da es Realtime-Subscriptions und Edge Cases (Browser-Absturz, Timeout) beruecksichtigen muss.

## 9. Navigation allgemein

Wie besprochen: Wird im naechsten Online-Termin definiert. Keine Aenderungen in diesem Schritt.

## 10. Excel-Import

Wird vorerst nicht angefasst -- Struktur muss zuerst besprochen und definiert werden.

## 11. Fuenf Berater einbinden

Das aktuelle System unterstuetzt bereits mehrere Benutzer mit gleichen Rechten (flaches Rollenmodell, RLS-Policies auf `authenticated`). Fuer eine explizite Berater-Verwaltung:
- **Kurzfristig:** Keine Aenderung noetig -- alle authentifizierten Nutzer haben die gleichen Rechte
- **Mittelfristig:** Ein `profiles`-basiertes Berater-Dropdown in Formularen (z.B. "Berater" als Select statt Freitext), damit konsistente Namen verwendet werden

---

## Technische Uebersicht

| Datei | Aenderung |
|---|---|
| `src/pages/ClientDetail.tsx` | Zurueck-Button: `navigate(-1)`, E-Mail kein Pflichtfeld mehr, Pflichtfeld-Sterne konsistent, Placeholder |
| `src/pages/Clients.tsx` | Buttons "Alle aufklappen" / "Alle zuklappen" |
| `src/components/NewClientDialog.tsx` | Pflichtfeld-Sterne pruefen, E-Mail-Placeholder |
| `src/components/ContactManagement.tsx` | Pflichtfeld-Sterne |
| `src/components/NewFindingDialog.tsx` | Pflichtfeld-Sterne |
| `src/pages/AuditDetail.tsx` | Berichtfunktion untersuchen/reparieren, Datumsformat pruefen |

**Nicht in diesem Schritt:**
- Client-Locking (erfordert Datenbankdesign + Realtime)
- Navigation-Redesign (naechster Online-Termin)
- Excel-Import (Struktur muss definiert werden)
- Berater-Management (laeuft bereits, Optimierung spaeter)

