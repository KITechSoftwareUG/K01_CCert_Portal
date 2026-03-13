

# Umsetzungsplan: 5 Verbesserungen

## 1. Nach Kundenanlage/-bearbeitung direkt zum Kunden navigieren

**Problem:** Der Zurueck-Button nutzt `navigate(-1)`, was nach dem Anlegen eines neuen Kunden (NewClientDialog) zurueck zur vorherigen Seite springt statt beim neuen Kunden zu bleiben. Beim Bearbeiten bleibt man schon auf der Seite.

**Ist-Zustand:** `NewClientDialog` navigiert bereits korrekt zu `/clients/${client.id}` nach Erstellung (Zeile 201). Der Zurueck-Button auf `ClientDetail` nutzt `navigate(-1)` — das ist korrekt, da er zum vorherigen Kontext zurueckfuehrt.

**Fix:** Kein Aenderungsbedarf bei der Navigation nach Anlegen — das funktioniert bereits. Beim **Bearbeiten** bleibt man auf der Detailseite (Zeile 185: `setIsEditing(false)`) — auch korrekt. Falls das Problem ist, dass man von ClientDetail zurueck zur **Clients-Liste** springt und der neue Kunde nicht sichtbar ist (weil zugeklappt): Nach dem Navigieren zu `/clients/${id}` den Client in der sessionStorage-Expansion automatisch aufklappen.

**Datei:** `src/pages/ClientDetail.tsx` — kein Fix noetig
**Datei:** `src/pages/Clients.tsx` — Auto-Expand: Wenn URL-Param oder sessionStorage einen "highlight client" enthaelt, diesen Kunden (und sein Land/Gruppe) automatisch aufklappen

## 2. Alle aufklappen / zuklappen

**Status:** Bereits implementiert (Zeilen 441-463 in Clients.tsx). Keine Aenderung noetig.

## 3. Concurrent Editing — Client Locking

**Neue Datenbanktabelle:** `client_locks` mit Feldern `client_id`, `locked_by` (user_id), `locked_at`, `expires_at` (auto-expire nach z.B. 5 Min)

**Logik:**
- Beim Oeffnen von ClientDetail: Lock anfordern (Insert in `client_locks`)
- Wenn bereits gelockt von anderem User: Banner anzeigen "Wird gerade von [User] bearbeitet" + Bearbeiten-Button deaktivieren
- Lock per Realtime-Subscription aktualisieren (Heartbeat alle 60s, Expire nach 5 Min Inaktivitaet)
- Beim Verlassen/Schliessen: Lock freigeben (Delete)

**Dateien:**
- DB-Migration: `client_locks` Tabelle + RLS
- Neuer Hook: `src/hooks/useClientLock.ts`
- `src/pages/ClientDetail.tsx` — Lock-Banner + Bearbeiten-Button-Logik

## 4. Kundenkennzeichnung "Online / Remote"

**Neue Spalte:** `audit_mode` in `clients`-Tabelle (Enum: `'on-site'`, `'remote'`, `'hybrid'`)

**UI-Aenderungen:**
- `ClientDetail.tsx` — Neues Select-Feld "Audit-Modus" im Bearbeitungsmodus + Badge-Anzeige im Lesemodus
- `NewClientDialog.tsx` — Neues Feld "Audit-Modus"
- `Clients.tsx` — Badge "Online/Remote" neben Kundenname in der Liste

**Datei:** DB-Migration + 3 Komponenten

## 5. Offene NKs beim Kunden auf der Startseite anzeigen

**Ist-Zustand:** `ClientAuditHistory` zeigt bereits eine Warnung mit offenen NKs (Zeile 160+), aber nur als Zusammenfassung in der Audit-Historie.

**Verbesserung:** Direkt bei jedem geplanten/laufenden Audit in der ClientAuditHistory die zugehoerigen offenen NKs als klappbare Liste anzeigen, sodass man sofort sieht welche NKs beim naechsten Audit relevant sind. Zusaetzlich alle offenen NKs (auch aus vergangenen Audits) prominent als eigene Card vor der Audit-Historie zeigen.

**Dateien:**
- `src/components/ClientAuditHistory.tsx` — Pro Audit-Zeile die offenen NKs einblendbar machen
- `src/pages/ClientDetail.tsx` — Neue "Offene Feststellungen" Card vor der Audit-Historie

---

## Zusammenfassung der Aenderungen

| # | Feature | DB-Aenderung | Dateien |
|---|---------|-------------|---------|
| 1 | Auto-Expand nach Kundenanlage | Nein | `Clients.tsx`, `NewClientDialog.tsx` |
| 2 | Alle auf-/zuklappen | Bereits vorhanden | — |
| 3 | Client Locking | Ja: `client_locks` Tabelle | Migration, `useClientLock.ts`, `ClientDetail.tsx` |
| 4 | Online/Remote Kennzeichnung | Ja: `audit_mode` Spalte | Migration, `ClientDetail.tsx`, `NewClientDialog.tsx`, `Clients.tsx` |
| 5 | Offene NKs beim Kunden | Nein | `ClientAuditHistory.tsx`, `ClientDetail.tsx` |

