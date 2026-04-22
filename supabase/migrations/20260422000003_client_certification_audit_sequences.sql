-- Kundenspezifische Audit-Sequenz-Überschreibung
-- Wenn Einträge vorhanden: diese werden verwendet (statt globaler Vorlage)
-- Wenn leer: Fallback auf certification_audit_sequences

CREATE TABLE client_certification_audit_sequences (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_certification_id UUID NOT NULL REFERENCES client_certifications(id) ON DELETE CASCADE,
  sequence_order          INT NOT NULL,
  audit_type              audit_type NOT NULL,
  offset_months           INT NOT NULL,
  label                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (client_certification_id, sequence_order)
);

ALTER TABLE client_certification_audit_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client sequences"
  ON client_certification_audit_sequences FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage client sequences"
  ON client_certification_audit_sequences FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_client_certification_audit_sequences_updated_at
  BEFORE UPDATE ON client_certification_audit_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger-Funktion aktualisieren: kundenspezifische Sequenz hat Vorrang
CREATE OR REPLACE FUNCTION create_audits_from_sequence()
RETURNS TRIGGER AS $$
DECLARE
  seq RECORD;
  scheduled DATE;
  use_client_specific BOOLEAN;
BEGIN
  IF NEW.valid_from IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.valid_from IS NOT NULL THEN RETURN NEW; END IF;

  SELECT EXISTS(
    SELECT 1 FROM client_certification_audit_sequences
    WHERE client_certification_id = NEW.id
  ) INTO use_client_specific;

  IF use_client_specific THEN
    FOR seq IN
      SELECT sequence_order, audit_type, offset_months
      FROM client_certification_audit_sequences
      WHERE client_certification_id = NEW.id
      ORDER BY sequence_order
    LOOP
      IF EXISTS (
        SELECT 1 FROM audits
        WHERE client_certification_id = NEW.id AND sequence_order = seq.sequence_order
      ) THEN CONTINUE; END IF;

      scheduled := (NEW.valid_from::DATE + (seq.offset_months || ' months')::INTERVAL)::DATE;
      INSERT INTO audits (client_id, client_certification_id, type, status, scheduled_date, sequence_order)
      VALUES (NEW.client_id, NEW.id, seq.audit_type, 'scheduled', scheduled, seq.sequence_order);
    END LOOP;
  ELSE
    FOR seq IN
      SELECT sequence_order, audit_type, offset_months
      FROM certification_audit_sequences
      WHERE certification_id = NEW.certification_id
      ORDER BY sequence_order
    LOOP
      IF EXISTS (
        SELECT 1 FROM audits
        WHERE client_certification_id = NEW.id AND sequence_order = seq.sequence_order
      ) THEN CONTINUE; END IF;

      scheduled := (NEW.valid_from::DATE + (seq.offset_months || ' months')::INTERVAL)::DATE;
      INSERT INTO audits (client_id, client_certification_id, type, status, scheduled_date, sequence_order)
      VALUES (NEW.client_id, NEW.id, seq.audit_type, 'scheduled', scheduled, seq.sequence_order);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
