-- Add country column to clients
ALTER TABLE public.clients ADD COLUMN country TEXT DEFAULT 'Deutschland';

-- Create certification_bodies table (the certification companies)
CREATE TABLE public.certification_bodies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for client-certification_body relationship
CREATE TABLE public.client_certification_bodies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  certification_body_id UUID NOT NULL REFERENCES public.certification_bodies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, certification_body_id)
);

-- Enable RLS
ALTER TABLE public.certification_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_certification_bodies ENABLE ROW LEVEL SECURITY;

-- RLS policies for certification_bodies
CREATE POLICY "Allow public read access to certification_bodies" ON public.certification_bodies FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to certification_bodies" ON public.certification_bodies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to certification_bodies" ON public.certification_bodies FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to certification_bodies" ON public.certification_bodies FOR DELETE USING (true);

-- RLS policies for client_certification_bodies
CREATE POLICY "Allow public read access to client_certification_bodies" ON public.client_certification_bodies FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to client_certification_bodies" ON public.client_certification_bodies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access to client_certification_bodies" ON public.client_certification_bodies FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_client_certification_bodies_client_id ON public.client_certification_bodies(client_id);
CREATE INDEX idx_client_certification_bodies_body_id ON public.client_certification_bodies(certification_body_id);
CREATE INDEX idx_clients_country ON public.clients(country);

-- Insert common certification bodies
INSERT INTO public.certification_bodies (name, short_name) VALUES
  ('TÜV Nord', 'TÜV Nord'),
  ('TÜV Süd', 'TÜV Süd'),
  ('TÜV Rheinland', 'TÜV Rheinland'),
  ('DEKRA', 'DEKRA'),
  ('DNV GL', 'DNV'),
  ('SGS Germany', 'SGS'),
  ('Bureau Veritas', 'BV'),
  ('Lloyds Register', 'LR'),
  ('GUTcert', 'GUTcert'),
  ('Control Union', 'CU');