-- audit_tasks.category und audit_tasks.severity sind TEXT ohne Validierung.
-- Beliebige Strings wurden akzeptiert — keine DB-seitige Absicherung.
-- Diese Migration fügt CHECK-Constraints für erlaubte Werte hinzu.

-- category: 'task' (Standard) oder 'finding' (Nichtkonformität)
ALTER TABLE public.audit_tasks
  ADD CONSTRAINT audit_tasks_category_check
    CHECK (category IN ('task', 'finding'));

-- severity: nur bei findings erlaubt; NULL ist gültig für reguläre Tasks
ALTER TABLE public.audit_tasks
  ADD CONSTRAINT audit_tasks_severity_check
    CHECK (severity IS NULL OR severity IN ('major', 'minor', 'recommendation'));

-- Konsistenz: severity darf nur gesetzt sein wenn category = 'finding'
ALTER TABLE public.audit_tasks
  ADD CONSTRAINT audit_tasks_severity_category_check
    CHECK (
      (category = 'finding') OR
      (category = 'task' AND severity IS NULL)
    );
