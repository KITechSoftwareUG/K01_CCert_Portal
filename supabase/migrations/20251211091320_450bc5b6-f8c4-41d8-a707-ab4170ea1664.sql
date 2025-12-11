-- Create enum types
CREATE TYPE public.audit_type AS ENUM ('initial', 'surveillance', 'recertification', 'six-month');
CREATE TYPE public.audit_status AS ENUM ('scheduled', 'in-progress', 'completed', 'cancelled');
CREATE TYPE public.task_status AS ENUM ('pending', 'in-progress', 'completed', 'overdue');
CREATE TYPE public.certification_standard AS ENUM ('SURE', 'FSC', 'PEFC', 'ISCC', 'ISO 9001', 'ISO 14001');

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  certifications certification_standard[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audits table
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type audit_type NOT NULL,
  certifications certification_standard[] DEFAULT '{}',
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status audit_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_tasks table
CREATE TABLE public.audit_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  assigned_to TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audits_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audit_tasks_updated_at
  BEFORE UPDATE ON public.audit_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_tasks ENABLE ROW LEVEL SECURITY;

-- Create public read policies (for now without auth - can be restricted later)
CREATE POLICY "Allow public read access to clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to clients" ON public.clients FOR DELETE USING (true);

CREATE POLICY "Allow public read access to audits" ON public.audits FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to audits" ON public.audits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to audits" ON public.audits FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to audits" ON public.audits FOR DELETE USING (true);

CREATE POLICY "Allow public read access to audit_tasks" ON public.audit_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to audit_tasks" ON public.audit_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to audit_tasks" ON public.audit_tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to audit_tasks" ON public.audit_tasks FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_audits_client_id ON public.audits(client_id);
CREATE INDEX idx_audits_scheduled_date ON public.audits(scheduled_date);
CREATE INDEX idx_audits_status ON public.audits(status);
CREATE INDEX idx_audit_tasks_audit_id ON public.audit_tasks(audit_id);
CREATE INDEX idx_audit_tasks_due_date ON public.audit_tasks(due_date);
CREATE INDEX idx_audit_tasks_status ON public.audit_tasks(status);