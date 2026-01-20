-- Add auditor_id column to client_certifications table
ALTER TABLE public.client_certifications 
ADD COLUMN auditor_id uuid REFERENCES public.auditors(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_client_certifications_auditor_id ON public.client_certifications(auditor_id);