-- Create audit_templates table (links certification + audit_type to template)
CREATE TABLE public.audit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  audit_type public.audit_type NOT NULL,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(certification_id, audit_type)
);

-- Create audit_template_tasks table (tasks within a template)
CREATE TABLE public.audit_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  days_before_audit INTEGER NOT NULL DEFAULT 14,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_template_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_templates
CREATE POLICY "Allow authenticated read access to audit_templates" 
ON public.audit_templates FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert access to audit_templates" 
ON public.audit_templates FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update access to audit_templates" 
ON public.audit_templates FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete access to audit_templates" 
ON public.audit_templates FOR DELETE 
USING (auth.role() = 'authenticated');

-- RLS policies for audit_template_tasks
CREATE POLICY "Allow authenticated read access to audit_template_tasks" 
ON public.audit_template_tasks FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert access to audit_template_tasks" 
ON public.audit_template_tasks FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update access to audit_template_tasks" 
ON public.audit_template_tasks FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete access to audit_template_tasks" 
ON public.audit_template_tasks FOR DELETE 
USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_audit_templates_updated_at
BEFORE UPDATE ON public.audit_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();