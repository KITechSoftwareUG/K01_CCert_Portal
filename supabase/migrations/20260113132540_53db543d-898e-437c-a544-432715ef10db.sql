-- Add parent_client_id for company groups
ALTER TABLE public.clients 
ADD COLUMN parent_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_clients_parent ON public.clients(parent_client_id);

-- Add comment for clarity
COMMENT ON COLUMN public.clients.parent_client_id IS 'Reference to parent company for group structures';