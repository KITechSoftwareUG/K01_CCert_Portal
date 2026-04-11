-- Schutz vor versehentlichem Datenverlust durch Cascade Deletes.
--
-- Problem: audits.client_id war ON DELETE CASCADE → ein Client-Delete
-- zog ALLE Audits, Tasks und Zertifizierungen mit, ohne Warnung.
--
-- Lösung: ON DELETE RESTRICT für die kritische clients → audits Verbindung.
-- Ein Client mit Audits kann nun nicht mehr gelöscht werden (DB-Fehler).
-- Die anderen Kaskaden (contacts, client_locks) bleiben CASCADE, da diese
-- untergeordnete Stammdaten sind die mit dem Client zusammengehören.

-- 1. clients → audits: CASCADE → RESTRICT
ALTER TABLE public.audits
  DROP CONSTRAINT IF EXISTS audits_client_id_fkey,
  ADD CONSTRAINT audits_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.clients(id)
    ON DELETE RESTRICT;

-- 2. client_certifications.client_id: CASCADE → RESTRICT
--    (Zertifizierungshistorie darf nicht still verschwinden)
ALTER TABLE public.client_certifications
  DROP CONSTRAINT IF EXISTS client_certifications_client_id_fkey,
  ADD CONSTRAINT client_certifications_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.clients(id)
    ON DELETE RESTRICT;

-- audits → audit_tasks bleibt CASCADE (Tasks ohne Audit sind sinnlos).
-- contacts → clients bleibt CASCADE (Kontakte ohne Client sind sinnlos).
-- client_locks → clients bleibt CASCADE (Locks räumen sich mit Client selbst auf).
-- certification_documents → client_certifications bleibt CASCADE.
