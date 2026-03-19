-- Add 'training' to audit_type enum
-- Using DO block to safely handle potential existing values or failures in different environments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'audit_type' AND e.enumlabel = 'training'
    ) THEN
        ALTER TYPE public.audit_type ADD VALUE 'training';
    END IF;
END $$;
