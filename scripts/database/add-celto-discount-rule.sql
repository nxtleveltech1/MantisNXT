-- Add Celto Brand Discount Rule for BC Electronics
-- Creates a 10% brand-level discount rule for Celto products from BC Electronics

-- Step 1: Find BC Electronics supplier ID
DO $$
DECLARE
  v_supplier_id UUID;
  v_brand_id UUID;
  v_org_id UUID;
BEGIN
  -- Find supplier
  SELECT supplier_id INTO v_supplier_id
  FROM core.supplier
  WHERE LOWER(name) LIKE '%bc electronics%'
     OR LOWER(name) LIKE '%bce%'
  LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'BC Electronics supplier not found';
  END IF;

  RAISE NOTICE 'Found supplier ID: %', v_supplier_id;

  -- Find or create Celto brand
  SELECT id INTO v_brand_id
  FROM public.brand
  WHERE LOWER(TRIM(name)) = LOWER('CELTO')
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    -- Try to get org_id if needed
    SELECT id INTO v_org_id
    FROM public.organization
    ORDER BY created_at
    LIMIT 1;

    -- Create brand (try with org_id first, fallback to without)
    BEGIN
      IF v_org_id IS NOT NULL THEN
        INSERT INTO public.brand (org_id, name, is_active, created_at, updated_at)
        VALUES (v_org_id, 'CELTO', true, NOW(), NOW())
        RETURNING id INTO v_brand_id;
      ELSE
        INSERT INTO public.brand (name, is_active, created_at, updated_at)
        VALUES ('CELTO', true, NOW(), NOW())
        RETURNING id INTO v_brand_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If org_id insert fails, try without
      INSERT INTO public.brand (name, is_active, created_at, updated_at)
      VALUES ('CELTO', true, NOW(), NOW())
      RETURNING id INTO v_brand_id;
    END;

    RAISE NOTICE 'Created brand ID: %', v_brand_id;
  ELSE
    RAISE NOTICE 'Found brand ID: %', v_brand_id;
  END IF;

  -- Check if rule exists
  IF EXISTS (
    SELECT 1 FROM core.supplier_discount_rules
    WHERE supplier_id = v_supplier_id
      AND scope_type = 'brand'
      AND brand_id = v_brand_id
  ) THEN
    -- Update existing rule
    UPDATE core.supplier_discount_rules
    SET discount_percent = 10,
        rule_name = 'Celto Brand 10% Discount',
        priority = 10,
        is_active = true,
        updated_at = NOW()
    WHERE supplier_id = v_supplier_id
      AND scope_type = 'brand'
      AND brand_id = v_brand_id;
    RAISE NOTICE 'Updated existing discount rule';
  ELSE
    -- Create new rule
    INSERT INTO core.supplier_discount_rules (
      supplier_id, rule_name, discount_percent, scope_type,
      brand_id, priority, is_active, valid_from
    ) VALUES (
      v_supplier_id,
      'Celto Brand 10% Discount',
      10,
      'brand',
      v_brand_id,
      10,
      true,
      NOW()
    );
    RAISE NOTICE 'Created new discount rule';
  END IF;

  RAISE NOTICE 'Discount rule created/updated successfully';
END $$;
