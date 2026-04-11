-- Zertifizierungsgesellschaft direkt auf client_certifications
-- Damit weiß das System: "DIESES Zertifikat gehört zu DIESEM Zertifizierer"
-- statt den Umweg über auditors oder client_certification_bodies zu nehmen.

ALTER TABLE public.client_certifications
  ADD COLUMN certification_body_id uuid
    REFERENCES public.certification_bodies(id)
    ON DELETE SET NULL;

CREATE INDEX idx_client_certifications_body_id
  ON public.client_certifications(certification_body_id);
