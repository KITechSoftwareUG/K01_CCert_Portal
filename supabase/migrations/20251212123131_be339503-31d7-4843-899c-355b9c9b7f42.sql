-- Add client_number and consultant to clients table
ALTER TABLE public.clients 
ADD COLUMN client_number text,
ADD COLUMN consultant text;

-- Add index for client_number for fast lookups
CREATE INDEX idx_clients_client_number ON public.clients(client_number);