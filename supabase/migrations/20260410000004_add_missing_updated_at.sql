-- Fehlende updated_at-Spalten + automatische Trigger für 3 Tabellen.
-- Ohne updated_at ist keine Änderungsverfolgung möglich.

-- 1. certifications
ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- 2. audit_template_tasks
ALTER TABLE public.audit_template_tasks
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- 3. certification_documents
ALTER TABLE public.certification_documents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Trigger-Funktion (wiederverwendbar, falls noch nicht vorhanden)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger für certifications
DROP TRIGGER IF EXISTS set_certifications_updated_at ON public.certifications;
CREATE TRIGGER set_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger für audit_template_tasks
DROP TRIGGER IF EXISTS set_audit_template_tasks_updated_at ON public.audit_template_tasks;
CREATE TRIGGER set_audit_template_tasks_updated_at
  BEFORE UPDATE ON public.audit_template_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger für certification_documents
DROP TRIGGER IF EXISTS set_certification_documents_updated_at ON public.certification_documents;
CREATE TRIGGER set_certification_documents_updated_at
  BEFORE UPDATE ON public.certification_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
