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

New migrations go in `supabase/migrations/` with descriptive filenames. Every table must have RLS enabled + `created_at`/`updated_at`. Apply via `supabase db push` or the Supabase MCP tools.
