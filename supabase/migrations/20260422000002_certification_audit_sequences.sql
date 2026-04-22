-- Audit-Sequenz-Vorlagen pro Zertifizierungstyp
-- Definiert welche Audits automatisch angelegt werden wenn valid_from gesetzt wird

CREATE TABLE certification_audit_sequences (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  sequence_order   INT NOT NULL,
  audit_type       audit_type NOT NULL,
  offset_months    INT NOT NULL,  -- Monate ab valid_from der client_certification
  label            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (certification_id, sequence_order)
);

ALTER TABLE certification_audit_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sequences"
  ON certification_audit_sequences FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage sequences"
  ON certification_audit_sequences FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_certification_audit_sequences_updated_at
  BEFORE UPDATE ON certification_audit_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- sequence_order auf audits: markiert automatisch generierte Audits
-- NULL = manuell angelegt, INT = entspricht sequence_order aus certification_audit_sequences
ALTER TABLE audits ADD COLUMN sequence_order INT DEFAULT NULL;

-- Trigger: erstellt Audits aus Sequenz-Vorlage wenn valid_from gesetzt wird
CREATE OR REPLACE FUNCTION create_audits_from_sequence()
RETURNS TRIGGER AS $$
DECLARE
  seq RECORD;
  scheduled DATE;
BEGIN
  -- Nur feuern wenn valid_from erstmals gesetzt wird
  IF NEW.valid_from IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.valid_from IS NOT NULL THEN
    RETURN NEW;
  END IF;

  FOR seq IN
    SELECT s.*
    FROM certification_audit_sequences s
    JOIN client_certifications cc ON cc.id = NEW.id
    WHERE s.certification_id = NEW.certification_id
    ORDER BY s.sequence_order
  LOOP
    -- Idempotenz: überspringen wenn Audit mit diesem sequence_order bereits existiert
    IF EXISTS (
      SELECT 1 FROM audits
      WHERE client_certification_id = NEW.id
        AND sequence_order = seq.sequence_order
    ) THEN
      CONTINUE;
    END IF;

    scheduled := (NEW.valid_from::DATE + (seq.offset_months || ' months')::INTERVAL)::DATE;

    INSERT INTO audits (
      client_id,
      client_certification_id,
      type,
      status,
      scheduled_date,
      sequence_order
    ) VALUES (
      NEW.client_id,
      NEW.id,
      seq.audit_type,
      'scheduled',
      scheduled,
      seq.sequence_order
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_sequence_audits
  AFTER INSERT OR UPDATE OF valid_from ON client_certifications
  FOR EACH ROW
  EXECUTE FUNCTION create_audits_from_sequence();
