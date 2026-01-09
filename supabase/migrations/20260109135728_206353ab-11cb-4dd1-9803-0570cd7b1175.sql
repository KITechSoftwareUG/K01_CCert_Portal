-- Create contacts table for multiple contacts per client
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to contacts"
ON public.contacts FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to contacts"
ON public.contacts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to contacts"
ON public.contacts FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to contacts"
ON public.contacts FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();