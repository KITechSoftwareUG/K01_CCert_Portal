-- 1. Create certifications master table
CREATE TABLE public.certifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for certifications
CREATE POLICY "Allow public read access to certifications" ON public.certifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to certifications" ON public.certifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to certifications" ON public.certifications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to certifications" ON public.certifications FOR DELETE USING (true);

-- Insert standard certifications
INSERT INTO public.certifications (name) VALUES 
    ('SURE'),
    ('FSC'),
    ('PEFC'),
    ('ISCC'),
    ('ISO 9001'),
    ('ISO 14001');

-- 2. Create auditors table
CREATE TABLE public.auditors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    certification_body_id UUID REFERENCES public.certification_bodies(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auditors ENABLE ROW LEVEL SECURITY;

-- RLS policies for auditors
CREATE POLICY "Allow public read access to auditors" ON public.auditors FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to auditors" ON public.auditors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to auditors" ON public.auditors FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to auditors" ON public.auditors FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_auditors_updated_at
    BEFORE UPDATE ON public.auditors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create client_certifications table (central linking table)
CREATE TABLE public.client_certifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
    certificate_number TEXT,
    valid_from DATE,
    valid_until DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'pending')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(client_id, certification_id)
);

-- Enable RLS
ALTER TABLE public.client_certifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_certifications
CREATE POLICY "Allow public read access to client_certifications" ON public.client_certifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to client_certifications" ON public.client_certifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to client_certifications" ON public.client_certifications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to client_certifications" ON public.client_certifications FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_client_certifications_updated_at
    BEFORE UPDATE ON public.client_certifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add new columns to audits table
ALTER TABLE public.audits 
    ADD COLUMN client_certification_id UUID REFERENCES public.client_certifications(id) ON DELETE SET NULL,
    ADD COLUMN auditor_id UUID REFERENCES public.auditors(id) ON DELETE SET NULL,
    ADD COLUMN certification_body_id UUID REFERENCES public.certification_bodies(id) ON DELETE SET NULL;

-- 5. Migrate existing data: Create client_certifications from clients.certifications array
INSERT INTO public.client_certifications (client_id, certification_id)
SELECT DISTINCT 
    c.id as client_id,
    cert.id as certification_id
FROM public.clients c
CROSS JOIN LATERAL unnest(c.certifications) AS cert_name
JOIN public.certifications cert ON cert.name = cert_name::text
WHERE c.certifications IS NOT NULL AND array_length(c.certifications, 1) > 0;