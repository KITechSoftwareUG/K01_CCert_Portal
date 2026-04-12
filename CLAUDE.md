# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Antwort-Stil (Token-Effizienz)

- **So kurz wie möglich** — keine Zusammenfassungen am Ende, kein "Hier ist was ich gemacht habe"
- Keine Wiederholungen, kein Boilerplate, kein erklärtes Offensichtliches
- Code-Änderungen kommentarlos ausgeben, es sei denn Logik ist nicht selbsterklärend
- Bei Fehlern: Ursache nennen + Fix — kein Kontext-Padding

---

## Commands

```bash
npm run dev        # Dev server (Vite)
npm run build      # Production build (kein echter TS-Check — immer auch npx tsc --noEmit laufen lassen)
npm run lint       # ESLint check
npm run preview    # Preview production build
npx tsc --noEmit   # Echter TypeScript-Check (Vite baut auch bei TS-Fehlern durch)
```

No test suite is configured. The app was bootstrapped with [Lovable](https://lovable.dev).

> ⚠️ **Vite baut auch bei TS-Fehlern durch** — kein Fehler im Terminal, aber das **Error Overlay blockiert ALLE Seiten** (inkl. Dashboard). `npx tsc --noEmit` nach jeder Typänderung zwingend.

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

---

## Architecture

**Stack:** React 18 + Vite + TypeScript, Supabase (PostgreSQL + Auth), TanStack Query, shadcn/ui, Tailwind CSS, React Router v6. **Kein Next.js** — alle `"use client"`-Hinweise von Hooks sind False Positives.

**Entry point:** `src/main.tsx` → `src/App.tsx`

### Routing & Auth

All routes except `/auth` are wrapped in `<ProtectedRoute><Layout />`. Auth state lives in `src/contexts/AuthContext.tsx` via `supabase.auth.onAuthStateChange`. The `useAuth()` hook exposes `user`, `session`, `loading`, `signOut`.

### Data Layer

Every entity follows the same pattern:
- **Hook file** in `src/hooks/use<Entity>.ts` — exports `useQuery`/`useMutation` wrappers around Supabase
- **Types** come from `src/integrations/supabase/types.ts` — **never hand-write DB types**, always use `Tables<'table_name'>`, `TablesInsert<'table_name'>`, `Enums<'enum_name'>`
- **Activity logging** on every mutation via `logActivity()` from `src/hooks/useActivityLog.ts`

### Seiten & Hooks (Stand April 2026)

| Route | Datei | Primärer Hook | Hinweis |
|-------|-------|--------------|---------|
| `/` | `Dashboard.tsx` | `useClients()`, `useAudits()`, `useAllAuditTasks()` | `useAllAuditTasks()` via `OpenTasksCard` — Fehler dort bricht Dashboard |
| `/audits` | `Audits.tsx` | `useAudits()` | |
| `/audits/:id` | `AuditDetail.tsx` | `useAuditTasks(auditId)` | |
| `/tasks` | `Tasks.tsx` | `useAllAuditTasks()` → `DbAuditTaskFull` | |
| `/clients` | `Clients.tsx` | `useClients()` | |

### Layout: Scroll-Ausnahmen
Pfade `/audits` und `/tasks` werden **nicht** in `scrollRef`-div gewrapped — sie verwalten ihren Scroll intern. Bei neuen Seiten mit eigenem Scroll: in `Layout.tsx` der Bedingung `['/audits', '/tasks'].includes(location.pathname)` hinzufügen.

### sessionStorage-Key-Konventionen
Schema: `{seite}-{schlüssel}` — am Seitenanfang als `const SS_KEY = '...'` definieren.

| Prefix | Seite |
|--------|-------|
| `audits-*` | Audits.tsx (search, status, group-by, …) |
| `tasks-*` | Tasks.tsx (search, status, category, due, group-by) |
| `clients-*` | Clients.tsx |
| `scroll-pos-{path}` | automatisch via `useScrollPersistence()` |

---

## Datenbankmodell (Stand April 2026)

**18 Tabellen**, 5 Postgres-Enums, RLS auf allen Tabellen aktiviert.

### Kern-Domänenmodell

```
clients (Kunden, auch hierarchisch: parent → child)
  └── client_certifications  (Zertifizierung pro Kunde, mit Ablaufdatum)
        ├── certifications        (Mastertabelle: ISO 9001, FSC, PEFC, etc.)
        ├── certification_bodies  (Zertifizierungsstelle: TÜV, etc.)
        ├── auditors              (Auditor, gehört zu einer certification_body)
        └── audits                (Audits zu dieser Zertifizierung)
              └── audit_tasks     (Aufgaben + Befunde pro Audit)
              └── audit_documents (Dokumente pro Audit)
```

Daneben:
- `contacts` — Kontakte pro Client (1:N)
- `consultants` — Berater-Mastertabelle
- `audit_templates` + `audit_template_tasks` — Vorlagen für automatische Task-Generierung
- `certification_documents` — Dokumente pro client_certification
- `client_certification_bodies` — Legacy Join-Tabelle (wird abgelöst, s.u.)
- `client_locks` — Concurrent-Edit-Schutz mit Realtime
- `profiles`, `user_roles` — Auth/Rollen
- `outlook_tokens` — OAuth für Outlook-Kalender-Integration
- `activity_log` — Audit-Trail (immutable, kein updated_at by design)

### Enums

```typescript
audit_type:    'initial' | 'surveillance' | 'recertification' | 'six-month' | 'internal' | 'training'
audit_status:  'scheduled' | 'in-progress' | 'completed' | 'cancelled'
task_status:   'pending' | 'in-progress' | 'completed' | 'overdue'
app_role:      'admin' | 'berater' | 'user'
certification_standard:  'SURE' | 'FSC' | 'PEFC' | 'ISCC' | 'ISO 9001' | 'ISO 14001'
```

### Wichtige FK-Regeln

| Beziehung | ON DELETE | Grund |
|-----------|-----------|-------|
| `audits.client_id` | RESTRICT | Client kann nicht gelöscht werden solange Audits existieren |
| `client_certifications.client_id` | RESTRICT | Client kann nicht gelöscht werden solange Zertifizierungen existieren |
| `audit_tasks.audit_id` | CASCADE | Tasks gehören dem Audit |
| `audit_documents.audit_id` | CASCADE | Dokumente gehören dem Audit |
| `contacts.client_id` | CASCADE | Kontakte gehören dem Client |
| `auditors.certification_body_id` | SET NULL | CB kann gelöscht werden |
| `audits.auditor_id` | SET NULL | Auditor kann gelöscht werden |

---

## Kritische Konventionen — Pflicht vor jeder Änderung lesen

### 1. Audit-Datum heißt `scheduled_date`
Immer `scheduled_date` verwenden — nie `date`, `audit_date` oder ähnliches.

### 2. Trigger-Funktion für `updated_at`
Immer `update_updated_at_column()` verwenden. Es existieren noch `set_updated_at()` (legacy, nicht neu verwenden) und `handle_updated_at()` (existiert nicht mehr, war ein Bug).

### 3. `audits.client_id` ist NICHT redundant
`audits` hat sowohl `client_id` als auch `client_certification_id`. Das ist kein Fehler: interne Audits (`type = 'internal'`) und Trainings (`type = 'training'`) haben keine `client_certification_id` — für diese ist `client_id` der einzige Client-Link.

### 4. `certifications` in `transformAuditToLocal` liefert max. 1 Eintrag
Die lokale `Audit.certifications: string[]` wird aus `client_certifications?.certifications?.name` befüllt — maximal ein Zertifizierungsname. Das ist Design, kein Bug. Outlook-Sync bekommt immer `certifications: []`.

### 5. `src/types/audit.ts` ist der lokale Frontend-Typ
`Audit` und `Client` in `src/types/audit.ts` sind lokale UI-Typen (camelCase, Dates als `Date`-Objekte). Sie unterscheiden sich bewusst von den DB-Typen (`Tables<'audits'>` etc.). `transformAuditToLocal()` in `src/lib/auditUtils.ts` übersetzt zwischen beiden.

### 6. ⚠️ Supabase `.select()` — Spaltennamen 1:1 aus `types.ts` abschreiben, NIE raten
Falsche Namen → Runtime-Fehler oder leeres Ergebnis (Supabase gibt kein Error zurück). Immer `src/integrations/supabase/types.ts` öffnen und exakten Namen kopieren.

| ✅ Richtig | ❌ Falsch |
|-----------|---------|
| `scheduled_date` | `date`, `audit_date` |
| `assigned_to` | `assignee` |
| `due_date` | `deadline` |
| `valid_from` / `valid_until` | `start_date` / `end_date` |

### 7. ⚠️ `useAllAuditTasks()` bricht Dashboard — immer Dashboard testen nach Änderungen
`OpenTasksCard` auf dem Dashboard nutzt `useAllAuditTasks()`. Fehler in `useAuditTasks.ts` → Error Overlay auf allen Seiten. Nach jeder Änderung an diesem Hook Dashboard öffnen und prüfen.

---

## Bekannte Altlasten — NICHT anfassen ohne expliziten Migrationsplan

### Bereits bereinigt (April 2026)
- `clients.certifications certification_standard[]` — **gedroppt**. Code-Referenzen entfernt.
- `audits.certifications certification_standard[]` — **gedroppt**. Code-Referenzen entfernt.

### Noch aktiv aber veraltet
- **`clients.consultant TEXT`** — Die Mastertabelle `consultants` existiert bereits. Dieses Feld sollte zu `clients.consultant_id UUID FK → consultants.id` migriert werden. Migration steht aus. Altes Textfeld nicht mehr befüllen.
- **`client_certification_bodies` Tabelle** — **GEDROPPT** (Migration `20260412000003`). Alle Code-Referenzen entfernt. Zertifizierungsstellen ausschließlich über `client_certifications.certification_body_id`.

### Noch vorhandener toter Code (bekannt, nicht kritisch)
- `Calendar.tsx` Zeile ~159: `certifications: [] as string[]` in lokalem UI-Objekt — kein DB-Write, nur irreführend.

### Bekannte Fallstricke (bereits passiert — nicht wiederholen)

| Bug | Ursache | Prävention |
|-----|---------|-----------|
| Dashboard blank (alle Seiten) | `task.audits.date` statt `.scheduled_date` → Vite Error Overlay | `npx tsc --noEmit` nach jeder Typänderung |
| Supabase liefert `null`/leer | Spaltenname in `.select()` falsch | Immer aus `types.ts` kopieren, nie raten |

---

## Technische Schulden — Status (April 2026)

### Behoben ✓
1. ~~`clients.consultant TEXT`~~ — **consultant_id FK migriert**, Code schreibt jetzt beide Felder
2. ~~`client_certification_bodies` Tabelle~~ — **gedroppt**, alle Hooks auf `client_certifications` umgestellt
3. ~~Fehlende `updated_at`~~ auf `certification_bodies`, `user_roles`, `client_locks` — **ergänzt**
4. ~~`useAutomaticAuditPlanning` Performance~~ — **Serverseite gefiltert** (nur aktive Certs im 36-Monats-Fenster, nur relevante Audits)
5. ~~Activity-Log fehlte~~ für `audit_tasks` Mutations — **ergänzt**
6. ~~`useAuditTasks.ts` Bug~~ `.date` statt `.scheduled_date` — **gefixt**
7. ~~`audit_documents` Trigger~~ rief `handle_updated_at()` auf (existiert nicht) — **gefixt** auf `update_updated_at_column()`

### Noch offen (klein)
- `clients.consultant TEXT` bleibt als Fallback-Feld erhalten bis alle Altdaten migriert sind — danach DROP COLUMN
- `Calendar.tsx` `certifications: []` — irreführend aber harmlos

---

## Supabase Edge Functions

Located in `supabase/functions/`:
- `outlook-auth` / `outlook-callback` — Microsoft OAuth flow
- `outlook-sync` — calendar sync
- `chat-assistant` — AI chat for the in-app assistant

---

## UI Conventions

- All UI primitives from `src/components/ui/` (shadcn/ui — no custom primitives)
- Icons exclusively from `lucide-react`
- Business logic in `src/lib/` or hooks, not in page/component files
- `src/lib/constants.ts` — alle Display-Labels und Config-Objekte für audit types, statuses, urgency
- Toast notifications via `sonner` (`import { toast } from "sonner"`)

### logActivity()
```typescript
// fire-and-forget — kein await in Komponenten
logActivity({ action, entity_type, entity_id?, entity_name?, details? });
// action: 'created' | 'updated' | 'deleted'  entity_type: Tabellenname z.B. 'audit_task'
// Aufruf immer in onSuccess-Callback der Mutation, nie im mutationFn
```

### Mobile Bottom Navigation
Nur 4 feste Items: **Dashboard** `/` · **Kunden** `/clients` · **Audits** `/audits` · **Aufgaben** `/tasks`. Alle weiteren Punkte nur in Desktop-Sidebar. Änderungen in `Layout.tsx` im inline-Array bei `{user && <nav ...>}`.

---

## Supabase Migrations

**WICHTIG:** Dieses Projekt läuft auf [Lovable](https://lovable.dev). Die Supabase-Datenbank ist dort integriert — es gibt keinen direkten CLI-Zugriff (`supabase db push` funktioniert NICHT).

Migrations-Dateien in `supabase/migrations/` dienen nur zur Dokumentation. Alle Datenbankänderungen müssen als **fertiges SQL** geliefert werden, das der Nutzer manuell im Supabase-Dashboard (SQL Editor) ausführt.

**Workflow bei DB-Änderungen:**
1. Migration-Datei in `supabase/migrations/` schreiben (zur Dokumentation)
2. Das vollständige SQL separat ausgeben mit dem Hinweis: "Im Supabase-Dashboard → SQL Editor ausführen"
3. Niemals `supabase db push`, `supabase migration up` oder ähnliche CLI-Befehle empfehlen

**Trigger-Funktion immer:** `update_updated_at_column()` — nicht `set_updated_at()` oder `handle_updated_at()`
