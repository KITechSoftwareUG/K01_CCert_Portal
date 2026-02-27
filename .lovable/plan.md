

# Plan: Zertifikate in der Audit-Uebersicht korrekt anzeigen

## Problem

Die Audit-Liste zeigt ueberall nur "–" statt des Zertifikatnamens. Die Ursache:

1. **`useAudits()` (Listenabfrage)** selektiert nur `clients(*)`, aber NICHT die verknuepfte Zertifizierung ueber `client_certifications -> certifications`
2. **`transformAuditToLocal()`** liest `dbAudit.certifications` -- das ist ein altes Enum-Array auf der `audits`-Tabelle, das bei neueren Audits leer ist
3. Die eigentliche Zuordnung laeuft ueber `audits.client_certification_id -> client_certifications.certification_id -> certifications.name`, aber dieser Join fehlt

## Loesung

### 1. `useAudits()` erweitern (src/hooks/useAudits.ts)

Die Query um den Join auf `client_certifications(id, certifications(*))` erweitern:

```sql
*, clients(*), client_certifications(id, certifications(*))
```

### 2. `transformAuditToLocal()` anpassen (src/lib/auditUtils.ts)

Die Zertifikat-Zuordnung priorisieren:
- **Primaer:** Wenn `client_certifications.certifications.name` vorhanden ist, diesen Namen verwenden
- **Fallback:** Das alte `certifications`-Enum-Array (fuer Altdaten)

### 3. Audit-Typ anpassen (src/types/audit.ts)

`certifications` im Audit-Interface von `CertificationStandard[]` auf `string[]` aendern, da die Zertifizierungsnamen jetzt dynamisch aus der DB kommen und nicht mehr auf die 6 Enum-Werte beschraenkt sind.

## Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/hooks/useAudits.ts` | Join auf `client_certifications(certifications(*))` hinzufuegen |
| `src/lib/auditUtils.ts` | Zertifikatname aus dem Join lesen, Fallback auf Legacy-Array |
| `src/types/audit.ts` | `certifications: string[]` statt `CertificationStandard[]` |

## Ergebnis

Jeder Audit in der Liste zeigt den korrekten Zertifikatnamen (z.B. "SURE", "FSC", "ISO 9001") als Badge an, basierend auf der tatsaechlichen Zuordnung ueber `client_certification_id`.
