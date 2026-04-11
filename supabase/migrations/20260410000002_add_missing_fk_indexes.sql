-- Fehlende Indizes auf Foreign Keys und häufig gefilterte Spalten.
-- Alle WHERE-Clauses auf diesen Spalten führten zuvor zu Full Table Scans.

-- audits
CREATE INDEX IF NOT EXISTS idx_audits_auditor_id              ON public.audits (auditor_id);
CREATE INDEX IF NOT EXISTS idx_audits_certification_body_id   ON public.audits (certification_body_id);
CREATE INDEX IF NOT EXISTS idx_audits_client_certification_id ON public.audits (client_certification_id);

-- client_certifications
CREATE INDEX IF NOT EXISTS idx_client_certifications_client_id       ON public.client_certifications (client_id);
CREATE INDEX IF NOT EXISTS idx_client_certifications_certification_id ON public.client_certifications (certification_id);
CREATE INDEX IF NOT EXISTS idx_client_certifications_auditor_id       ON public.client_certifications (auditor_id);
CREATE INDEX IF NOT EXISTS idx_client_certifications_valid_until      ON public.client_certifications (valid_until);

-- certification_documents
CREATE INDEX IF NOT EXISTS idx_certification_documents_client_certification_id ON public.certification_documents (client_certification_id);

-- auditors
CREATE INDEX IF NOT EXISTS idx_auditors_certification_body_id ON public.auditors (certification_body_id);

-- contacts
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON public.contacts (client_id);

-- client_locks
CREATE INDEX IF NOT EXISTS idx_client_locks_client_id ON public.client_locks (client_id);

-- outlook_tokens
CREATE INDEX IF NOT EXISTS idx_outlook_tokens_user_id ON public.outlook_tokens (user_id);
