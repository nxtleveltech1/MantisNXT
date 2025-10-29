-- Create function core.update_updated_at_column if missing
-- Date: 2025-10-29

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'core' AND p.proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION core.update_updated_at_column()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $do$;
