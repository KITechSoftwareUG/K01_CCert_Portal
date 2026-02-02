-- Add notes field to clients table
ALTER TABLE public.clients
ADD COLUMN notes text;