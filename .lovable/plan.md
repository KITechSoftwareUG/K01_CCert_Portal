
# Plan: Dashboard- und UI-Verbesserungen

## 1. Audit-Historie: Alle Audits anzeigen + Audit-Art hinzufuegen + Sortierung

**Datei:** `src/components/ClientAuditHistory.tsx`

- Das `limit`-Prop entfernen bzw. auf unbegrenzt setzen, damit alle Audits des Kunden angezeigt werden.
- Neben dem Status-Badge die **Audit-Art** (z.B. "Initialaudit", "Ueberwachungsaudit") als zusaetzliche Info anzeigen -- aktuell wird nur `AUDIT_TYPE_LABELS[audit.type]` als Titel angezeigt, das ist bereits die Audit-Art. Es soll aber klarer als eigenes Badge dargestellt werden.
- **Sortierung aendern:** Geplante Audits von 2026 aufsteigend (aelteste zuerst oben), abgeschlossene Audits darunter.
  - Sortierlogik: Erst "scheduled"/"in-progress" Audits nach `scheduled_date` aufsteigend, dann "completed"/"cancelled" nach `scheduled_date` absteigend.
- Das `limit={10}` in `ClientDetail.tsx` (Zeile 621) entfernen.

## 2. Neues Audit erstellen: Alle Zertifizierungen anzeigen

**Datei:** `src/components/NewAuditDialog.tsx`

- **Problem:** Die Checkbox-Liste nutzt `Constants.public.Enums.certification_standard`, was nur die 6 Enum-Werte enthaelt (SURE, FSC, PEFC, ISCC, ISO 9001, ISO 14001). Es fehlen weitere Zertifizierungen, die in der `certifications`-Tabelle gespeichert sind.
- **Loesung:** Statt der statischen Enum-Liste die `useCertifications()`-Hook verwenden, um alle Zertifizierungen aus der Datenbank zu laden. Die Checkboxen dann dynamisch aus diesen Daten generieren.

## 3. Kundendetail: Audit-Uebersicht chronologisch 2026 oben, 2028 unten

Wird durch die neue Sortierung in Punkt 1 abgedeckt (aufsteigende Sortierung fuer geplante Audits).

## 4. Zertifikat-Status immer farbig darstellen

**Dateien:** `src/pages/ClientDetail.tsx`, `src/pages/Clients.tsx`

Ueberall wo Zertifizierungsstatus angezeigt wird, konsistente Farbgebung einfuehren:
- **active/valid** = Gruenes Badge
- **suspended** = Oranges Badge
- **expired** = Rotes Badge

**ClientDetail.tsx** (Zeile ~600): Beim Rendern der Zertifizierungen ein farbiges Status-Badge hinzufuegen basierend auf `cc.status`.

**Clients.tsx** (Zeilen ~281-284, ~806-809): Die bestehende Status-Badge-Logik erweitern, sodass auch "active" gruen, "suspended" orange und "expired" rot angezeigt wird -- aktuell wird der Status nur als Text angezeigt ohne Farbe bei "suspended".

## 5. BIOCEN: Ueberwachungsaudits nicht angezeigt

**Datei:** `src/hooks/useAutomaticAuditPlanning.ts`

- **Problem:** Das automatische Planungssystem schlaegt Ueberwachungsaudits nur vor, wenn es bereits **abgeschlossene** Audits gibt (`completedAudits.length > 0`, Zeile 73) und das letzte Audit mindestens 10 Monate zurueckliegt.
- **Loesung:** Die Logik erweitern: Wenn eine Zertifizierung ein `valid_from`-Datum hat aber noch keine abgeschlossenen Audits existieren, soll das System trotzdem einen Ueberwachungsaudit vorschlagen (z.B. 12 Monate nach `valid_from`). Zusaetzlich auch geplante (nicht nur abgeschlossene) Audits als Basis fuer die Berechnung heranziehen.

## 6. Aenderungen der Aufgaben nicht uebernommen

Dieses Problem muss naeher untersucht werden. Es koennte mit der Cache-Invalidierung oder dem Speichern der Aufgaben zusammenhaengen. Dies wird im Rahmen der Implementierung geprueft.

---

## Technische Uebersicht der Aenderungen

| Datei | Aenderung |
|---|---|
| `src/components/ClientAuditHistory.tsx` | Limit entfernen, Sortierung anpassen (scheduled aufsteigend, completed unten), Audit-Art als Badge |
| `src/pages/ClientDetail.tsx` | `limit`-Prop entfernen, Status-Badge bei Zertifizierungen farbig machen |
| `src/components/NewAuditDialog.tsx` | `useCertifications()` statt statischer Enum-Liste verwenden |
| `src/pages/Clients.tsx` | Farbige Status-Badges fuer Zertifizierungen (gruen/orange/rot) |
| `src/hooks/useAutomaticAuditPlanning.ts` | Surveillance-Vorschlaege auch ohne abgeschlossene Audits (basierend auf `valid_from`) |
