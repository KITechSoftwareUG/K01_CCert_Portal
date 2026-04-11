-- Sicherheitsfix: Jeder User sieht nur seine eigenen Activity-Logs
DROP POLICY IF EXISTS "Authenticated users can read activity_log" ON public.activity_log;

CREATE POLICY "Users can read own activity_log"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
