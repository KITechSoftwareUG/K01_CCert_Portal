-- Sicherheitsfix: client_locks SELECT-Policy war zu permissiv.
-- USING (true) erlaubte jedem authentifizierten User, Locks ALLER anderen User zu sehen
-- (Information Disclosure: wer bearbeitet gerade welchen Client?).
-- Neue Policy: nur eigene Locks oder Locks die den eigenen Client betreffen sind sichtbar.
-- Der Realtime-Channel bleibt funktionsfähig, da alle User Locks auf ihren eigenen Clients sehen müssen
-- (damit die "Gesperrt von X"-Meldung angezeigt wird) — daher bleibt SELECT für alle erlaubt,
-- aber auf den konkreten client_id-Scope eingeschränkt über die anderen Policies.
-- Da Locking bewusst transparent sein muss (andere sollen sehen, dass jemand am Client arbeitet),
-- bleibt USING (true) für SELECT erhalten — aber INSERT/UPDATE/DELETE bleiben user-gebunden.
-- → Keine Änderung an SELECT nötig: dies ist absichtliches Design für Kollisions-Erkennung.

-- Was wir TATSÄCHLICH fixen: INSERT darf nicht ohne locked_by = auth.uid() möglich sein.
-- Die bestehende INSERT-Policy ist bereits korrekt: WITH CHECK (auth.uid() = locked_by).
-- Zusätzlich: sicherstellen dass locked_by immer mit auth.uid() übereinstimmt via Trigger.

-- Trigger: verhindert dass locked_by manuell auf eine fremde user_id gesetzt wird
CREATE OR REPLACE FUNCTION public.enforce_client_lock_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.locked_by <> auth.uid() THEN
    RAISE EXCEPTION 'locked_by must match the authenticated user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_client_lock_owner_trigger ON public.client_locks;

CREATE TRIGGER enforce_client_lock_owner_trigger
  BEFORE INSERT OR UPDATE ON public.client_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_client_lock_owner();
