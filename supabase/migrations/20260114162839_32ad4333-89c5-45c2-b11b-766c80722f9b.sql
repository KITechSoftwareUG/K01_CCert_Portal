-- Add scope field to client_certifications table
ALTER TABLE public.client_certifications
ADD COLUMN scope text;

-- Add is_active field to clients table with default true
ALTER TABLE public.clients
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add index for faster filtering on is_active
CREATE INDEX idx_clients_is_active ON public.clients(is_active);