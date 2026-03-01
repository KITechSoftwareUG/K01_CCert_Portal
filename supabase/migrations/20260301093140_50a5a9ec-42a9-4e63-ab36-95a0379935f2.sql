
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activity_log"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert activity_log"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.activity_log (entity_type, entity_id);
