-- 1. Client locks table for concurrent editing prevention
CREATE TABLE public.client_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  locked_by uuid NOT NULL,
  locked_by_name text,
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  UNIQUE(client_id)
);

ALTER TABLE public.client_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_locks"
  ON public.client_locks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert client_locks"
  ON public.client_locks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = locked_by);

CREATE POLICY "Users can update own locks"
  ON public.client_locks FOR UPDATE TO authenticated
  USING (auth.uid() = locked_by);

CREATE POLICY "Users can delete own locks"
  ON public.client_locks FOR DELETE TO authenticated
  USING (auth.uid() = locked_by);

-- Enable realtime for client_locks
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_locks;

-- 2. Add audit_mode column to clients
ALTER TABLE public.clients ADD COLUMN audit_mode text DEFAULT 'on-site';