# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server (Vite)
npm run build      # Production build
npm run lint       # ESLint check
npm run preview    # Preview production build
```

No test suite is configured. The app was bootstrapped with [Lovable](https://lovable.dev).

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Architecture

**Stack:** React 18 + Vite + TypeScript, Supabase (PostgreSQL + Auth), TanStack Query, shadcn/ui, Tailwind CSS, React Router v6.

**Entry point:** `src/main.tsx` → `src/App.tsx`

### Routing & Auth

All routes except `/auth` are wrapped in `<ProtectedRoute><Layout />`. Auth state lives in `src/contexts/AuthContext.tsx` via `supabase.auth.onAuthStateChange`. The `useAuth()` hook exposes `user`, `session`, `loading`, `signOut`.

### Data Layer

Every entity follows the same pattern:
- **Hook file** in `src/hooks/use<Entity>.ts` — exports `useQuery`/`useMutation` wrappers around Supabase
- **Types** come from generated `src/integrations/supabase/types.ts` (never hand-write DB types)
- **Activity logging** on every mutation via `logActivity()` from `src/hooks/useActivityLog.ts`

Always use `Tables<'table_name'>`, `TablesInsert<'table_name'>`, and `Enums<'enum_name'>` from the generated types.

### Key Domain Concepts

- **Clients** can be standalone or grouped (parent/child). A client with `client_number === null` AND children is a group header — it is not a real customer. Filter with `client_number !== null` to count actual clients/sites.
- **Audits** have types: `initial`, `surveillance`, `recertification`, `six-month`, `internal`, `training`. Status: `scheduled`, `in-progress`, `completed`, `cancelled`.
- **Certifications** are standards (e.g. ISO 9001). `client_certifications` is the join table linking clients to certifications with validity dates.
- **Certification Bodies** can be linked to clients directly (`client_certification_bodies`) or indirectly via auditors.
- **Audit Templates** define task checklists per `audit_type` + `certification_id`. When an audit is created, template tasks are copied into `audit_tasks`.

### Bekannte Altlasten — NICHT anfassen ohne Migrationsplan

- `clients.certifications certification_standard[]` — OBSOLET. Daten sind in `client_certifications`. Nie lesen oder beschreiben.
- `audits.certifications certification_standard[]` — OBSOLET. Nie lesen oder beschreiben.
- `clients.consultant TEXT` — VERALTET. Die Master-Tabelle `consultants` existiert bereits. Künftig `clients.consultant_id UUID FK → consultants.id` verwenden (Migration steht noch aus).
- `client_certification_bodies` Tabelle — WIRD ABGELÖST durch `client_certifications.certification_body_id`. Neue Logik nur über direktes Feld.

### Wichtige Namenskonventionen (DB)

- Audit-Datum heißt immer `scheduled_date` — NICHT `date`, `audit_date` oder ähnliches.
- Trigger-Funktion für `updated_at` immer: `update_updated_at_column()` — nicht `set_updated_at()` oder `handle_updated_at()`.

### audits.client_id — warum nicht redundant

`audits` hat sowohl `client_id` als auch `client_certification_id`. Das ist **kein Fehler**: interne Audits (`type = 'internal'`) und Trainings (`type = 'training'`) haben keine `client_certification_id` und brauchen `client_id` als primäres Link. Bei zertifizierungsbezogenen Audits sind beide gesetzt.

### Datenbankmodell-Stand (April 2026)

17 Tabellen, 5 Postgres-Enums, RLS auf allen Tabellen aktiviert. Das Modell hat mehrere Evolutionsstufen — immer erst fragen "existiert das Feld wirklich?" bevor neue Hooks geschrieben werden. Die Datei `src/integrations/supabase/types.ts` kann veraltet sein — im Zweifelsfall gegen die aktuellen Migrations-Dateien in `supabase/migrations/` abgleichen.

### Supabase Edge Functions

Located in `supabase/functions/`:
- `outlook-auth` / `outlook-callback` — Microsoft OAuth flow
- `outlook-sync` — calendar sync
- `chat-assistant` — AI chat for the in-app assistant

### UI Conventions

- All UI primitives come from `src/components/ui/` (shadcn/ui — do not add custom primitives)
- Icons exclusively from `lucide-react`
- Business logic belongs in `src/lib/` or hooks, not in page/component files
- `src/lib/constants.ts` holds all display labels and config objects for audit types, statuses, and urgency levels
- Toast notifications via `sonner` (`import { toast } from "sonner"`)

### Supabase Migrations

**WICHTIG:** Dieses Projekt läuft auf [Lovable](https://lovable.dev). Die Supabase-Datenbank ist dort integriert — es gibt keinen direkten CLI-Zugriff (`supabase db push` funktioniert NICHT).

Migrations-Dateien in `supabase/migrations/` dienen nur zur Dokumentation. Alle Datenbankänderungen müssen als **fertiges SQL** geliefert werden, das der Nutzer manuell im Supabase-Dashboard (SQL Editor) ausführt.

**Workflow bei DB-Änderungen:**
1. Migration-Datei in `supabase/migrations/` schreiben (zur Dokumentation)
2. Das vollständige SQL separat ausgeben mit dem Hinweis: "Im Supabase-Dashboard → SQL Editor ausführen"
3. Niemals `supabase db push`, `supabase migration up` oder ähnliche CLI-Befehle empfehlen
