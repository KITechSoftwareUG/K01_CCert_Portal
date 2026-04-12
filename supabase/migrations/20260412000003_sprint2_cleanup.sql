-- Sprint 2 Cleanup
-- Im Supabase-Dashboard → SQL Editor ausführen
-- Alle Statements in einem Rutsch ausführen

-- ============================================================
-- 1. updated_at auf certification_bodies
-- ============================================================
ALTER TABLE public.certification_bodies
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER certification_bodies_updated_at
  BEFORE UPDATE ON public.certification_bodies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. updated_at auf user_roles
-- ============================================================
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. created_at + updated_at auf client_locks
-- ============================================================
ALTER TABLE public.client_locks
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.client_locks
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER client_locks_updated_at
  BEFORE UPDATE ON public.client_locks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. consultant_id FK auf clients
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS consultant_id UUID REFERENCES public.consultants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_consultant_id
  ON public.clients (consultant_id);

-- Datenmigration: bestehende consultant TEXT-Werte auf consultant_id mappen
UPDATE public.clients c
SET consultant_id = con.id
FROM public.consultants con
WHERE TRIM(LOWER(c.consultant)) = TRIM(LOWER(con.name))
  AND c.consultant IS NOT NULL
  AND c.consultant_id IS NULL;

-- ============================================================
-- 5. client_certification_bodies Tabelle droppen
--    (Code wurde bereits auf client_certifications.certification_body_id umgestellt)
-- ============================================================
DROP TABLE IF EXISTS public.client_certification_bodies;
