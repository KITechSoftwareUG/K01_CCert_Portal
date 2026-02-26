-- Add category and severity columns to audit_tasks
ALTER TABLE public.audit_tasks 
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'task',
  ADD COLUMN IF NOT EXISTS severity text;

-- Add comment for documentation
COMMENT ON COLUMN public.audit_tasks.category IS 'task = reguläre Aufgabe, finding = Nichtkonformität/Feststellung';
COMMENT ON COLUMN public.audit_tasks.severity IS 'major = Haupt-NK, minor = Neben-NK, recommendation = Empfehlung (nur für findings)';