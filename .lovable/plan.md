# Dashboard-Summen Analyse und Korrektur

## Problem

Die Zahl "277 Kunden gesamt" zaehlt **jeden Eintrag** in der `clients`-Tabelle, inklusive:

- **11 Unternehmensgruppen** (Eltern-Eintraege mit Kindern) — das sind keine eigenstaendigen Kunden, sondern Gruppen-Header
- **39 Standorte/Kinder** — werden separat gezaehlt, obwohl sie zu einer Gruppe gehoeren
- **227 eigenstaendige Kunden** — die tatsaechlichen Einzelkunden

Die korrekte Zaehlweise waere: **Einfach alle Unternehmen!**

## Analyse aller Dashboard-Summen


| Widget                                                  | Was wird gezaehlt                              | Problem?                                                                              |
| ------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Kunden gesamt / Aktiv / Inaktiv**                     | Alle `clients`-Zeilen                          | **Ja** — Gruppen-Header werden als Kunden gezaehlt, Standorte werden separat gezaehlt |
| **Aktive Kunden nach Land** (CountryStatsCard)          | Alle aktiven `clients`                         | **Ja** — gleicher Fehler, zaehlt Gruppen-Header und Standorte einzeln                 |
| **Ablaufende Zertifikate** (ExpiringCertificationsCard) | `client_certifications` mit `valid_until` ≤90d | **OK** — zaehlt Zertifikate, nicht Kunden. Korrekt.                                   |
| **Datenqualitaet** (DataQualityWarningsCard)            | `client_certifications` ohne Auditor/Datum     | **OK** — zaehlt Qualitaetsprobleme pro Zertifikat. Korrekt.                           |
| **Audit-Statistik** (AuditYearStatsCard)                | `audits` im aktuellen Jahr, aktive Kunden      | **OK** — zaehlt Audits, nicht Kunden. Korrekt.                                        |
| **Warnungen** (AlertsCard)                              | Ueberfaellige Tasks und nahende Audits         | **OK** — zaehlt Warnungen. Korrekt.                                                   |


## Loesung

### Korrektur der Kunden-Zaehlung

 **Nur Eintraege mit** `client_number` **zaehlen** — das sind die "echten" Kunden/Standorte. Reine Gruppen-Header haben `client_number === null` (siehe Zeile 138 in useClientGroups: `const isExplicitGroup = parent.client_number === null`).

**Empfohlene Variante:** Zwei Zeilen anzeigen:

- **Kunden/Standorte**: Nur Eintraege mit `client_number` (die echten Kunden)
- **Unternehmensgruppen**: Anzahl der Gruppen (Eltern mit Kindern)

### Betroffene Dateien

1. `**src/pages/Dashboard.tsx**` — `clientStats`-Berechnung anpassen: Gruppen-Header (`client_number === null` UND hat Kinder) ausschliessen; StatCards umbenennen
2. `**src/components/CountryStatsCard.tsx**` — gleiche Filter-Logik: nur Eintraege mit `client_number` zaehlen
3. `**src/components/StatCard.tsx**` — keine Aenderung noetig

### Implementierung

**Dashboard.tsx** — `clientStats` Memo aendern:

- Kunden mit `client_number !== null` als "Kunden/Standorte" zaehlen
- Optional: Gruppen-Header separat zaehlen und als 4. Stat anzeigen (oder weglassen)
- Aktiv/Inaktiv ebenfalls nur auf echte Kunden filtern

**CountryStatsCard.tsx** — Filter anpassen:

- `clients.filter(c => c.is_active !== false && c.client_number !== null)` statt nur `is_active`-Check