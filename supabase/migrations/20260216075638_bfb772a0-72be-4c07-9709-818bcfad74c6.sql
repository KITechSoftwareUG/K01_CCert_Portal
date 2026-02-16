-- Make email column nullable on clients table
ALTER TABLE public.clients ALTER COLUMN email DROP NOT NULL;