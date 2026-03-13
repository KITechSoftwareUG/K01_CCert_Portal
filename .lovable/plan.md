

# Drei Bugfixes: Zertifikats-Sichtbarkeit, Inaktive Kunden, Aufgaben-Datumsverschiebung

## 1. Aufgaben-Fristen verschieben sich nicht (EditAuditDialog)

**Root Cause:** Der `useEffect` in `EditAuditDialog.tsx` (Zeile 61-67) haengt von `[audit]` ab. Da `audit` ein Objekt-Prop ist, das bei jedem React-Query-Refetch eine neue Referenz bekommt, wird `scheduledDate` laufend auf das Original zurueckgesetzt. Wenn ein Hintergrund-Refetch zwischen Datumswahl und Klick auf "Speichern" passiert, geht die Aenderung verloren und `daysDiff === 0`.

**Fix in `src/components/EditAuditDialog.tsx`:**
- Einen separaten `originalDate`-State einfuehren, der nur einmal beim Oeffnen des Dialogs gesetzt wird (via `audit.id` als Dependency statt `audit`)
- `daysDiff` aus `scheduledDate` vs `originalDate` berechnen statt vs `audit.scheduled_date`
- So kann kein Refetch die Berechnung stoeren

## 2. Inaktive Kunden in der Audit-Liste (z.B. DML Invest)

**Root Cause:** In der Filter-Logik (Zeile 180) wird `clientInfo?.is_active !== false` geprueft. Wenn `clientInfo` undefined ist (Clients noch nicht geladen oder Client-ID nicht gefunden), ergibt `undefined !== false` = `true`, und der Audit wird faelschlich angezeigt.

**Fix in `src/pages/Audits.tsx`:**
- Pruefung aendern: Wenn `clientStatusFilter === 'active'`, muss `clientInfo?.is_active === true` oder mindestens `clientInfo` existieren UND `is_active` nicht `false` sein
- Zusaetzlich: Wenn `clientInfo` undefined ist und Filter auf `active` steht, Audit ausblenden

## 3. Abgelaufene/suspended Zertifizierungen beim Kunden sichtbar machen

**Aktuell:** Status-Badges werden bereits angezeigt (Zeile 617-620 in ClientDetail.tsx), aber nur als kleine Badges. Wenn eine Zertifizierung `expired` oder `suspended` ist, soll die gesamte Zeile farblich hervorgehoben werden.

**Fix in `src/pages/ClientDetail.tsx`:**
- Den Hintergrund der Zertifizierungs-Zeile (Zeile 611) konditional einfaerben:
  - `expired` → `bg-red-50 border-red-200` statt `bg-muted/50`
  - `suspended` → `bg-orange-50 border-orange-200` statt `bg-muted/50`
- Ein kleines Warnsymbol (AlertTriangle) bei problematischen Zertifizierungen hinzufuegen

---

## Betroffene Dateien

1. `src/components/EditAuditDialog.tsx` — originalDate-State, useEffect-Dependency auf `audit?.id`, daysDiff-Fix
2. `src/pages/Audits.tsx` — Filter-Logik fuer inaktive Kunden robuster machen
3. `src/pages/ClientDetail.tsx` — Zertifizierungs-Zeilen farblich hervorheben bei expired/suspended

