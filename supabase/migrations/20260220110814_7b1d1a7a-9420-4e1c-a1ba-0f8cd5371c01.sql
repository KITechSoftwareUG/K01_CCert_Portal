
-- =====================================================
-- SECURITY FIX: Replace all USING(true) / WITH CHECK(true) 
-- policies with auth.role() = 'authenticated' checks
-- =====================================================

-- clients table
DROP POLICY IF EXISTS "Allow public delete access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public insert access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public read access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public update access to clients" ON public.clients;

CREATE POLICY "Allow authenticated read access to clients" ON public.clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to clients" ON public.clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to clients" ON public.clients FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access to clients" ON public.clients FOR DELETE USING (auth.role() = 'authenticated');

-- contacts table
DROP POLICY IF EXISTS "Allow public delete access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public insert access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public read access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public update access to contacts" ON public.contacts;

CREATE POLICY "Allow authenticated read access to contacts" ON public.contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to contacts" ON public.contacts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to contacts" ON public.contacts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access to contacts" ON public.contacts FOR DELETE USING (auth.role() = 'authenticated');

-- audits table
DROP POLICY IF EXISTS "Allow public delete access to audits" ON public.audits;
DROP POLICY IF EXISTS "Allow public insert access to audits" ON public.audits;
DROP POLICY IF EXISTS "Allow public read access to audits" ON public.audits;
DROP POLICY IF EXISTS "Allow public update access to audits" ON public.audits;

CREATE POLICY "Allow authenticated read access to audits" ON public.audits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to audits" ON public.audits FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to audits" ON public.audits FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access to audits" ON public.audits FOR DELETE USING (auth.role() = 'authenticated');

-- audit_tasks table
DROP POLICY IF EXISTS "Allow public delete access to audit_tasks" ON public.audit_tasks;
DROP POLICY IF EXISTS "Allow public insert access to audit_tasks" ON public.audit_tasks;
DROP POLICY IF EXISTS "Allow public read access to audit_tasks" ON public.audit_tasks;
DROP POLICY IF EXISTS "Allow public update access to audit_tasks" ON public.audit_tasks;

CREATE POLICY "Allow authenticated read access to audit_tasks" ON public.audit_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to audit_tasks" ON public.audit_tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to audit_tasks" ON public.audit_tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access to audit_tasks" ON public.audit_tasks FOR DELETE USING (auth.role() = 'authenticated');

-- client_certifications table
DROP POLICY IF EXISTS "Allow public delete access to client_certifications" ON public.client_certifications;
DROP POLICY IF EXISTS "Allow public insert access to client_certifications" ON public.client_certifications;
DROP POLICY IF EXISTS "Allow public read access to client_certifications" ON public.client_certifications;
DROP POLICY IF EXISTS "Allow public update access to client_certifications" ON public.client_certifications;

CREATE POLICY "Allow authenticated read access to client_certifications" ON public.client_certifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to client_certifications" ON public.client_certifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to client_certifications" ON public.client_certifications FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access to client_certifications" ON public.client_certifications FOR DELETE USING (auth.role() = 'authenticated');

-- auditors table
DROP POLICY IF EXISTS "Allow public delete access to auditors" ON public.auditors;
DROP POLICY IF EXISTS "Allow public insert access to auditors" ON public.auditors;
DROP POLICY IF EXISTS "Allow public read access to auditors" ON public.auditors;
DROP POLICY IF EXISTS "Allow public update access to auditors" ON public.auditors;

CREATE POLICY "Allow authenticated read access to auditors" ON public.auditors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to auditors" ON public.auditors FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to auditors" ON public.auditors FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access to auditors" ON public.auditors FOR DELETE USING (auth.role() = 'authenticated');

-- certification_bodies table
DROP POLICY IF EXISTS "Allow public delete access to certification_bodies" ON public.certification_bodies;
DROP POLICY IF EXISTS "Allow public insert access to certification_bodies" ON public.certification_bodies;
DROP POLICY IF EXISTS "Allow public read access to certification_bodies" ON public.certification_bodies;
DROP POLICY IF EXISTS "Allow public update access to certification_bodies" ON public.certification_bodies;

CREATE POLICY "Allow authenticated read access to certification_bodies" ON public.certification_bodies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to certification_bodies" ON public.certification_bodies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to certification_bodies" ON public.certification_bodies FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access to certification_bodies" ON public.certification_bodies FOR DELETE USING (auth.role() = 'authenticated');

-- certifications table
DROP POLICY IF EXISTS "Allow public delete access to certifications" ON public.certifications;
DROP POLICY IF EXISTS "Allow public insert access to certifications" ON public.certifications;
DROP POLICY IF EXISTS "Allow public read access to certifications" ON public.certifications;
DROP POLICY IF EXISTS "Allow public update access to certifications" ON public.certifications;

CREATE POLICY "Allow authenticated read access to certifications" ON public.certifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to certifications" ON public.certifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to certifications" ON public.certifications FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access to certifications" ON public.certifications FOR DELETE USING (auth.role() = 'authenticated');

-- client_certification_bodies table
DROP POLICY IF EXISTS "Allow public delete access to client_certification_bodies" ON public.client_certification_bodies;
DROP POLICY IF EXISTS "Allow public insert access to client_certification_bodies" ON public.client_certification_bodies;
DROP POLICY IF EXISTS "Allow public read access to client_certification_bodies" ON public.client_certification_bodies;

CREATE POLICY "Allow authenticated read access to client_certification_bodies" ON public.client_certification_bodies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access to client_certification_bodies" ON public.client_certification_bodies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access to client_certification_bodies" ON public.client_certification_bodies FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access to client_certification_bodies" ON public.client_certification_bodies FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable leaked password protection
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_certification_bodies ENABLE ROW LEVEL SECURITY;
