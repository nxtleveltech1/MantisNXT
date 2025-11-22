-- Migration: 0216_enforce_supplier_org_id.sql
-- Description: Enforce org_id requirement on core.supplier table
-- Notes:
--   * Makes org_id NOT NULL with FK constraint
--   * Backfills existing suppliers with default org_id
--   * Neon-compatible (idempotent)

BEGIN;

-- Step 1: Get default org_id (use first org or fallback)
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Try to get first organization from database
  SELECT id INTO default_org_id
  FROM public.organization
  ORDER BY created_at
  LIMIT 1;

  -- If no org exists, use the known default
  IF default_org_id IS NULL THEN
    default_org_id := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  END IF;

  -- Step 2: Backfill existing suppliers with null org_id
  UPDATE core.supplier
  SET org_id = default_org_id
  WHERE org_id IS NULL;

  RAISE NOTICE 'Backfilled suppliers with org_id: %', default_org_id;
END $$;

-- Step 3: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'core'
      AND table_name = 'supplier'
      AND constraint_name = 'supplier_org_id_fkey'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE core.supplier
    ADD CONSTRAINT supplier_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES public.organization(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint supplier_org_id_fkey';
  END IF;
END $$;

-- Step 4: Make org_id NOT NULL
DO $$
BEGIN
  -- Check if column is already NOT NULL
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'supplier'
      AND column_name = 'org_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE core.supplier
    ALTER COLUMN org_id SET NOT NULL;
    
    RAISE NOTICE 'Set org_id to NOT NULL';
  END IF;
END $$;

COMMIT;

