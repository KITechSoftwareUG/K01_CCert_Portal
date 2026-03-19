-- Create consultants table
CREATE TABLE IF NOT EXISTS public.consultants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;

-- RLS policies for consultants
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultants' AND policyname = 'Allow authenticated read access to consultants') THEN
        CREATE POLICY "Allow authenticated read access to consultants" ON public.consultants FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultants' AND policyname = 'Allow authenticated insert access to consultants') THEN
        CREATE POLICY "Allow authenticated insert access to consultants" ON public.consultants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultants' AND policyname = 'Allow authenticated update access to consultants') THEN
        CREATE POLICY "Allow authenticated update access to consultants" ON public.consultants FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultants' AND policyname = 'Allow authenticated delete access to consultants') THEN
        CREATE POLICY "Allow authenticated delete access to consultants" ON public.consultants FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_consultants_updated_at') THEN
        CREATE TRIGGER update_consultants_updated_at
            BEFORE UPDATE ON public.consultants
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Update existing data in clients table
UPDATE public.clients SET consultant = 'Jan Pane' WHERE consultant = 'Jan-Uwe Pane';
UPDATE public.clients SET consultant = NULL WHERE consultant = '0000';
UPDATE public.clients SET consultant = TRIM(consultant) WHERE consultant IS NOT NULL;

-- Insert existing unique consultants into the new table
INSERT INTO public.consultants (name)
SELECT DISTINCT consultant 
FROM public.clients 
WHERE consultant IS NOT NULL AND consultant != ''
ON CONFLICT (name) DO NOTHING;
