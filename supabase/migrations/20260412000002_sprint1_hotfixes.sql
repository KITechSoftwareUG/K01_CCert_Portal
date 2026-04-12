-- Sprint 1 Hotfixes
-- Im Supabase-Dashboard → SQL Editor ausführen

-- ============================================================
-- 1. Fehlende Indizes auf audit_templates und audit_template_tasks
--    Diese FK-Spalten haben keine Indizes → langsame JOINs
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_templates_certification_id
  ON public.audit_templates (certification_id);

CREATE INDEX IF NOT EXISTS idx_audit_template_tasks_template_id
  ON public.audit_template_tasks (template_id);


-- ============================================================
-- 2. outlook_tokens.user_id: UNIQUE aber kein FK → Phantom-Tokens möglich
--    Lösung: FK zu auth.users hinzufügen mit CASCADE beim User-Löschen
-- ============================================================

ALTER TABLE public.outlook_tokens
  ADD CONSTRAINT outlook_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ============================================================
-- 3. Redundante Array-Spalten entfernen
--
--    clients.certifications[] und audits.certifications[] sind OBSOLET.
--    Die Daten sind seit Migration 20260113132026 in client_certifications.
--    Alle Code-Referenzen wurden bereinigt (siehe Git-Diff).
-- ============================================================

ALTER TABLE public.clients DROP COLUMN IF EXISTS certifications;
ALTER TABLE public.audits DROP COLUMN IF EXISTS certifications;
