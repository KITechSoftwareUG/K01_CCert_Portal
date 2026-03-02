

# Bug-Fix: Spaltenverschiebung bei Gruppierung nach Kunde/Auditart

## Problem

Wenn nach "Kunde" gruppiert wird, blendet `AuditRow` die Kunde-Zelle aus (`showClient=false`), aber der Tabellenkopf zeigt weiterhin alle 7 Spalten. Dadurch haben die Zeilen nur 6 Zellen, waehrend der Header 7 hat -- alle Inhalte rutschen um eine Spalte nach links.

Gleiches Problem bei Gruppierung nach "Auditart" (`showType=false`).

## Loesung

**Datei:** `src/pages/Audits.tsx`

Die `TableHeader`-Zeilen (Zeilen 336-344) muessen die gleichen Bedingungen wie `AuditRow` verwenden:

- "Kunde"-Spalte nur anzeigen wenn `groupBy !== 'client'`
- "Auditart"-Spalte nur anzeigen wenn `groupBy !== 'type'`
- Spaltenbreiten anpassen, damit sie bei weniger Spalten korrekt verteilt sind

Konkret wird der Header-Block so geaendert, dass `showClient` und `showType` Variablen auch dort greifen:

```tsx
<TableRow>
  {groupBy !== 'client' && <TableHead className="text-left w-[25%]">Kunde</TableHead>}
  <TableHead className="text-left w-[15%]">Zertifikat</TableHead>
  {groupBy !== 'type' && <TableHead className="text-left w-[15%]">Auditart</TableHead>}
  <TableHead className="text-left w-[15%]">Termin</TableHead>
  <TableHead className="text-left w-[12%]">Status</TableHead>
  <TableHead className="text-left w-[12%]">Aufgaben</TableHead>
  <TableHead className="w-[6%]"></TableHead>
</TableRow>
```

Dies betrifft nur eine Stelle in der Datei (Zeilen 336-344). Keine weiteren Dateien betroffen.

