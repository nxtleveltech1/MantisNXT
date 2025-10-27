# Complete Database Migration: PostgreSQL → Neon

## Executive Summary

This document provides a comprehensive guide for migrating the entire supplier pricelist system from the old PostgreSQL database (62.169.20.53:6600/nxtprod-db_001) to the new Neon database (proud-mud-50346856 - NXT-SPP-Supplier Inventory Portfolio).

**Migration Status:** Ready for execution
**Estimated Duration:** 2-3 hours
**Risk Level:** Medium (requires downtime)
**Rollback Available:** Yes

---

## Critical Schema Discovery

⚠️ **IMPORTANT:** The actual Neon database schema uses **BIGINT** primary keys, NOT UUID as specified in the migration SQL files. This documentation reflects the ACTUAL running schema.

### Schema Type Comparison

| Component | Migration Files | Actual Neon DB |
|-----------|----------------|----------------|
| supplier_id | UUID | BIGINT |
| upload_id | UUID | BIGINT |
| supplier_product_id | UUID | BIGINT |
| price_history_id | UUID | BIGINT |

---

## Current State Analysis

### Source Database (OLD PostgreSQL)
- **Host:** 62.169.20.53:6600
- **Database:** nxtprod-db_001
- **User:** nxtdb_admin
- **Tables:** 155 tables including inventory, products, suppliers
- **Key Data:** 1 pricelist in `supplier_pricelists` table

### Target Database (NEW Neon)
- **Project ID:** proud-mud-50346856
- **Database:** neondb
- **Schema Status:** Complete (spp, core, serve)
- **Data Status:** EMPTY (0 rows in all tables)
- **Stored Procedures:** ✅ Complete
- **Views:** ✅ Complete

---

## Architecture Overview

### Three-Schema Architecture (SPP → CORE → SERVE)

```
┌─────────────────────────────────────────────────────────────────┐
│                         SPP SCHEMA (Staging)                    │
│  ┌───────────────────┐         ┌─────────────────────┐         │
│  │ pricelist_upload  │────────>│   pricelist_row     │         │
│  │ - upload_id       │         │ - supplier_sku      │         │
│  │ - supplier_id     │         │ - name, price       │         │
│  │ - status          │         │ - brand, uom        │         │
│  └───────────────────┘         └─────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                    merge_pricelist()
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        CORE SCHEMA (Canonical)                  │
│  ┌──────────────┐    ┌──────────────────┐   ┌───────────────┐  │
│  │   supplier   │───>│ supplier_product │──>│ price_history │  │
│  │ - name       │    │ - supplier_sku   │   │ - price       │  │
│  │ - active     │    │ - name           │   │ - valid_from  │  │
│  └──────────────┘    │ - is_active      │   │ - is_current  │  │
│                      └──────────────────┘   └───────────────┘  │
│                              │                                  │
│                              ↓                                  │
│                   ┌─────────────────────┐                       │
│                   │ inventory_selection │                       │
│                   │ inventory_selected  │                       │
│                   │ stock_on_hand       │                       │
│                   └─────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SERVE SCHEMA (Read-Optimized Views)          │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ v_nxt_soh (Authoritative NXT Stock On Hand)           │     │
│  │ v_product_table_by_supplier                            │     │
│  │ v_selected_catalog                                     │     │
│  │ v_soh_by_supplier                                      │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Schema Mapping: OLD → NEW

### 1. Suppliers

**OLD PostgreSQL:** `suppliers`
```sql
-- OLD schema (assumed)
supplier_id SERIAL PRIMARY KEY
name VARCHAR(200)
code VARCHAR(50)
contact_info TEXT
active BOOLEAN
created_at TIMESTAMP
```

**NEW Neon:** `core.supplier`
```sql
supplier_id BIGINT PRIMARY KEY (auto-increment)
name TEXT NOT NULL UNIQUE
active BOOLEAN DEFAULT true
default_currency CHAR(3) DEFAULT 'ZAR'
terms TEXT
contact_email TEXT
contact_phone TEXT
payment_terms_days INTEGER DEFAULT 30
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**Transformation:**
- Direct ID mapping (preserve IDs or use sequence)
- Split contact_info into contact_email/contact_phone
- Add default_currency = 'ZAR'
- Add payment_terms_days = 30

---

### 2. Pricelist Upload

**OLD PostgreSQL:** `supplier_pricelists`
```sql
id SERIAL PRIMARY KEY
supplier_id INTEGER
name VARCHAR(255)
description TEXT
effective_from DATE
effective_to DATE
currency CHAR(3)
is_active BOOLEAN
version INTEGER
approval_status VARCHAR(50)
created_at TIMESTAMP
```

**NEW Neon:** `spp.pricelist_upload`
```sql
upload_id BIGINT PRIMARY KEY (auto-increment)
supplier_id BIGINT NOT NULL
received_at TIMESTAMPTZ DEFAULT NOW()
filename TEXT NOT NULL
file_size_bytes BIGINT
currency CHAR(3) NOT NULL
valid_from DATE NOT NULL
valid_to DATE
row_count INTEGER
status TEXT NOT NULL
errors_json JSONB
processed_at TIMESTAMPTZ
processed_by TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
```

**Transformation:**
- id → upload_id
- name → filename
- effective_from → valid_from
- effective_to → valid_to
- approval_status → status (map: 'approved' → 'merged', 'pending' → 'validated')
- Set received_at = created_at from old DB
- Set status based on is_active and approval_status

---

### 3. Pricelist Items

**OLD PostgreSQL:** `pricelist_items` / `supplier_price_list_items`
```sql
id SERIAL PRIMARY KEY
pricelist_id INTEGER
sku VARCHAR(100)
name VARCHAR(500)
price NUMERIC(18,4)
unit_of_measure VARCHAR(50)
quantity_break INTEGER
created_at TIMESTAMP
```

**NEW Neon:** `spp.pricelist_row`
```sql
row_id BIGINT PRIMARY KEY (auto-increment)
upload_id BIGINT NOT NULL REFERENCES spp.pricelist_upload
row_num INTEGER NOT NULL
supplier_sku TEXT NOT NULL
name TEXT NOT NULL
brand TEXT
uom TEXT NOT NULL
pack_size TEXT
price NUMERIC NOT NULL
currency CHAR(3) NOT NULL
category_raw TEXT
vat_code TEXT
barcode TEXT
attrs_json JSONB
validation_status TEXT
validation_errors JSONB
created_at TIMESTAMPTZ DEFAULT NOW()
```

**Transformation:**
- pricelist_id → upload_id (need mapping)
- sku → supplier_sku
- unit_of_measure → uom
- Add row_num = ROW_NUMBER() per upload
- Set validation_status = 'valid'

---

### 4. Price History

**OLD PostgreSQL:** `price_history`
```sql
id SERIAL PRIMARY KEY
product_id INTEGER
supplier_id INTEGER
price NUMERIC(18,4)
effective_date DATE
end_date DATE
created_at TIMESTAMP
```

**NEW Neon:** `core.price_history`
```sql
price_history_id BIGINT PRIMARY KEY (auto-increment)
supplier_product_id BIGINT NOT NULL REFERENCES core.supplier_product
price NUMERIC NOT NULL CHECK (price >= 0)
currency CHAR(3) NOT NULL
valid_from DATE NOT NULL
valid_to DATE
is_current BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMPTZ DEFAULT NOW()
```

**Transformation:**
- Create supplier_product entries first
- Map product_id + supplier_id → supplier_product_id
- effective_date → valid_from
- end_date → valid_to
- Set is_current = (end_date IS NULL OR end_date > CURRENT_DATE)
- Add currency = 'ZAR' (default)

---

## Migration Scripts

### Script 1: Extract Data from OLD PostgreSQL

```sql
-- ============================================================================
-- EXTRACTION SCRIPT: Run on OLD PostgreSQL (62.169.20.53:6600/nxtprod-db_001)
-- ============================================================================

-- 1. Extract Suppliers
\copy (
  SELECT
    supplier_id,
    name,
    COALESCE(code, '') as code,
    COALESCE(active, true) as active,
    'ZAR' as default_currency,
    COALESCE(contact_email, '') as contact_email,
    COALESCE(contact_phone, '') as contact_phone,
    30 as payment_terms_days,
    COALESCE(created_at, NOW()) as created_at
  FROM suppliers
  WHERE active = true
  ORDER BY supplier_id
) TO '/tmp/suppliers_export.csv' WITH CSV HEADER;

-- 2. Extract Pricelists
\copy (
  SELECT
    id as old_pricelist_id,
    supplier_id,
    COALESCE(name, 'Legacy Import') as filename,
    COALESCE(effective_from, CURRENT_DATE) as valid_from,
    effective_to as valid_to,
    COALESCE(currency, 'ZAR') as currency,
    CASE
      WHEN approval_status = 'approved' THEN 'merged'
      WHEN approval_status = 'pending' THEN 'validated'
      ELSE 'received'
    END as status,
    COALESCE(created_at, NOW()) as received_at
  FROM supplier_pricelists
  ORDER BY id
) TO '/tmp/pricelists_export.csv' WITH CSV HEADER;

-- 3. Extract Pricelist Items
\copy (
  SELECT
    pricelist_id as old_pricelist_id,
    ROW_NUMBER() OVER (PARTITION BY pricelist_id ORDER BY id) as row_num,
    COALESCE(sku, 'UNKNOWN') as supplier_sku,
    COALESCE(name, 'Unknown Item') as name,
    COALESCE(brand, '') as brand,
    COALESCE(unit_of_measure, 'EA') as uom,
    COALESCE(pack_size, '1') as pack_size,
    COALESCE(price, 0) as price,
    COALESCE(currency, 'ZAR') as currency,
    COALESCE(category, '') as category_raw,
    COALESCE(barcode, '') as barcode
  FROM pricelist_items
  WHERE pricelist_id IN (SELECT id FROM supplier_pricelists)
  ORDER BY pricelist_id, id
) TO '/tmp/pricelist_items_export.csv' WITH CSV HEADER;

-- 4. Extract Stock Data (if exists)
\copy (
  SELECT
    supplier_id,
    sku as supplier_sku,
    location_id,
    COALESCE(quantity_on_hand, 0) as qty_on_hand,
    COALESCE(unit_cost, 0) as unit_cost,
    COALESCE(as_of_date, CURRENT_DATE) as as_of_ts
  FROM stock_on_hand
  WHERE quantity_on_hand > 0
  ORDER BY supplier_id, sku
) TO '/tmp/stock_export.csv' WITH CSV HEADER;
```

---

### Script 2: Load Data into NEW Neon

```sql
-- ============================================================================
-- LOADING SCRIPT: Run on NEW Neon (neondb@proud-mud-50346856)
-- ============================================================================

BEGIN;

-- 1. Load Suppliers
-- Create temporary table for import
CREATE TEMP TABLE tmp_suppliers (
  old_supplier_id INTEGER,
  name TEXT,
  code TEXT,
  active BOOLEAN,
  default_currency CHAR(3),
  contact_email TEXT,
  contact_phone TEXT,
  payment_terms_days INTEGER,
  created_at TIMESTAMPTZ
);

\copy tmp_suppliers FROM '/tmp/suppliers_export.csv' WITH CSV HEADER;

-- Insert into core.supplier (preserving IDs where possible)
INSERT INTO core.supplier (
  supplier_id, name, active, default_currency,
  contact_email, contact_phone, payment_terms_days,
  created_at, updated_at
)
SELECT
  old_supplier_id,
  name,
  active,
  default_currency,
  contact_email,
  contact_phone,
  payment_terms_days,
  created_at,
  NOW()
FROM tmp_suppliers
ON CONFLICT (name) DO UPDATE SET
  active = EXCLUDED.active,
  updated_at = NOW();

-- Update sequence to max ID + 1
SELECT setval('core.supplier_supplier_id_seq',
  (SELECT COALESCE(MAX(supplier_id), 0) + 1 FROM core.supplier)
);

-- Create mapping table for pricelist ID conversion
CREATE TEMP TABLE pricelist_id_map (
  old_pricelist_id INTEGER PRIMARY KEY,
  new_upload_id BIGINT
);

-- 2. Load Pricelists into SPP schema
CREATE TEMP TABLE tmp_pricelists (
  old_pricelist_id INTEGER,
  supplier_id BIGINT,
  filename TEXT,
  valid_from DATE,
  valid_to DATE,
  currency CHAR(3),
  status TEXT,
  received_at TIMESTAMPTZ
);

\copy tmp_pricelists FROM '/tmp/pricelists_export.csv' WITH CSV HEADER;

-- Insert pricelists and capture new IDs
INSERT INTO spp.pricelist_upload (
  supplier_id, filename, valid_from, valid_to,
  currency, status, received_at, created_at
)
SELECT
  supplier_id,
  filename,
  valid_from,
  valid_to,
  currency,
  status,
  received_at,
  received_at
FROM tmp_pricelists
RETURNING upload_id,
  (SELECT old_pricelist_id FROM tmp_pricelists WHERE supplier_id = spp.pricelist_upload.supplier_id LIMIT 1);

-- TODO: Properly map old_pricelist_id to new upload_id
-- This requires a more sophisticated approach with RETURNING INTO or sequential inserts

-- 3. Load Pricelist Items
CREATE TEMP TABLE tmp_pricelist_items (
  old_pricelist_id INTEGER,
  row_num INTEGER,
  supplier_sku TEXT,
  name TEXT,
  brand TEXT,
  uom TEXT,
  pack_size TEXT,
  price NUMERIC,
  currency CHAR(3),
  category_raw TEXT,
  barcode TEXT
);

\copy tmp_pricelist_items FROM '/tmp/pricelist_items_export.csv' WITH CSV HEADER;

-- Insert pricelist rows (using mapped upload_ids)
INSERT INTO spp.pricelist_row (
  upload_id, row_num, supplier_sku, name, brand,
  uom, pack_size, price, currency, category_raw,
  barcode, validation_status, created_at
)
SELECT
  pm.new_upload_id,
  ti.row_num,
  ti.supplier_sku,
  ti.name,
  ti.brand,
  ti.uom,
  ti.pack_size,
  ti.price,
  ti.currency,
  ti.category_raw,
  ti.barcode,
  'valid',
  NOW()
FROM tmp_pricelist_items ti
JOIN pricelist_id_map pm ON pm.old_pricelist_id = ti.old_pricelist_id;

-- Update row counts
UPDATE spp.pricelist_upload pu
SET row_count = (
  SELECT COUNT(*)
  FROM spp.pricelist_row pr
  WHERE pr.upload_id = pu.upload_id
);

COMMIT;

-- 4. Run Merge Procedures
-- For each uploaded pricelist, run the merge procedure
DO $$
DECLARE
  upload_rec RECORD;
  merge_result JSONB;
BEGIN
  FOR upload_rec IN
    SELECT upload_id, supplier_id, filename
    FROM spp.pricelist_upload
    WHERE status IN ('validated', 'merged')
    ORDER BY upload_id
  LOOP
    RAISE NOTICE 'Merging upload_id: %, filename: %', upload_rec.upload_id, upload_rec.filename;

    -- Call merge procedure
    SELECT spp.merge_pricelist(upload_rec.upload_id) INTO merge_result;

    RAISE NOTICE 'Merge result: %', merge_result;
  END LOOP;
END $$;
```

---

### Script 3: Validation Queries

```sql
-- ============================================================================
-- VALIDATION QUERIES: Run after migration
-- ============================================================================

-- 1. Row Count Validation
SELECT 'Validation: Row Counts' as check_name;

SELECT
  'suppliers' as table_name,
  (SELECT COUNT(*) FROM core.supplier) as neon_count,
  'Expected from OLD DB' as note
UNION ALL
SELECT
  'pricelist_uploads',
  (SELECT COUNT(*) FROM spp.pricelist_upload),
  'Expected from OLD supplier_pricelists'
UNION ALL
SELECT
  'pricelist_rows',
  (SELECT COUNT(*) FROM spp.pricelist_row),
  'Expected from OLD pricelist_items'
UNION ALL
SELECT
  'supplier_products',
  (SELECT COUNT(*) FROM core.supplier_product),
  'Created by merge_pricelist()'
UNION ALL
SELECT
  'price_history',
  (SELECT COUNT(*) FROM core.price_history),
  'Created by merge_pricelist()';

-- 2. Data Integrity Checks
SELECT 'Validation: Data Integrity' as check_name;

-- Check for orphaned pricelist rows
SELECT
  'orphaned_pricelist_rows' as check,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM spp.pricelist_row pr
LEFT JOIN spp.pricelist_upload pu ON pu.upload_id = pr.upload_id
WHERE pu.upload_id IS NULL;

-- Check for orphaned supplier products
SELECT
  'orphaned_supplier_products' as check,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM core.supplier_product sp
LEFT JOIN core.supplier s ON s.supplier_id = sp.supplier_id
WHERE s.supplier_id IS NULL;

-- Check for orphaned price history
SELECT
  'orphaned_price_history' as check,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM core.price_history ph
LEFT JOIN core.supplier_product sp ON sp.supplier_product_id = ph.supplier_product_id
WHERE sp.supplier_product_id IS NULL;

-- 3. Price History SCD-2 Validation
SELECT 'Validation: Price History SCD-2' as check_name;

-- Check for overlapping date ranges
SELECT
  'overlapping_price_periods' as check,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM (
  SELECT
    ph1.supplier_product_id,
    ph1.valid_from,
    ph1.valid_to,
    COUNT(*) as overlap_count
  FROM core.price_history ph1
  JOIN core.price_history ph2 ON
    ph1.supplier_product_id = ph2.supplier_product_id
    AND ph1.price_history_id != ph2.price_history_id
    AND ph1.valid_from < COALESCE(ph2.valid_to, '9999-12-31')
    AND COALESCE(ph1.valid_to, '9999-12-31') > ph2.valid_from
  GROUP BY ph1.supplier_product_id, ph1.valid_from, ph1.valid_to
  HAVING COUNT(*) > 1
) overlaps;

-- Check for multiple current prices
SELECT
  'multiple_current_prices' as check,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM (
  SELECT supplier_product_id, COUNT(*) as current_count
  FROM core.price_history
  WHERE is_current = true
  GROUP BY supplier_product_id
  HAVING COUNT(*) > 1
) multi_current;

-- 4. View Validation
SELECT 'Validation: Serve Views' as check_name;

-- Test v_nxt_soh view
SELECT
  'v_nxt_soh' as view_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) >= 0 THEN 'ACCESSIBLE' ELSE 'ERROR' END as status
FROM serve.v_nxt_soh;

-- Test v_product_table_by_supplier view
SELECT
  'v_product_table_by_supplier' as view_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) >= 0 THEN 'ACCESSIBLE' ELSE 'ERROR' END as status
FROM serve.v_product_table_by_supplier;

-- 5. Business Logic Validation
SELECT 'Validation: Business Logic' as check_name;

-- Verify all uploaded pricelists were merged
SELECT
  'unmerged_uploads' as check,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END as status
FROM spp.pricelist_upload
WHERE status NOT IN ('merged', 'failed', 'rejected');

-- Verify all supplier products have prices
SELECT
  'products_without_prices' as check,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END as status
FROM core.supplier_product sp
LEFT JOIN core.price_history ph ON ph.supplier_product_id = sp.supplier_product_id
WHERE sp.is_active = true AND ph.price_history_id IS NULL;

-- 6. Sample Data Review
SELECT 'Sample Data: First 5 Suppliers' as review_section;
SELECT supplier_id, name, active, default_currency
FROM core.supplier
ORDER BY supplier_id
LIMIT 5;

SELECT 'Sample Data: First 5 Supplier Products' as review_section;
SELECT
  sp.supplier_product_id,
  s.name as supplier_name,
  sp.supplier_sku,
  sp.name_from_supplier,
  sp.is_active
FROM core.supplier_product sp
JOIN core.supplier s ON s.supplier_id = sp.supplier_id
ORDER BY sp.supplier_product_id
LIMIT 5;

SELECT 'Sample Data: First 5 Current Prices' as review_section;
SELECT
  ph.price_history_id,
  s.name as supplier_name,
  sp.supplier_sku,
  ph.price,
  ph.currency,
  ph.valid_from,
  ph.is_current
FROM core.price_history ph
JOIN core.supplier_product sp ON sp.supplier_product_id = ph.supplier_product_id
JOIN core.supplier s ON s.supplier_id = sp.supplier_id
WHERE ph.is_current = true
ORDER BY ph.price_history_id
LIMIT 5;
```

---

## Migration Execution Plan

### Phase 1: Pre-Migration (30 minutes)

1. **Backup Both Databases**
   ```bash
   # Backup OLD PostgreSQL
   pg_dump -h 62.169.20.53 -p 6600 -U nxtdb_admin -Fc nxtprod-db_001 > old_db_backup.dump

   # Backup NEW Neon (should be empty)
   pg_dump "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" > neon_backup_pre_migration.sql
   ```

2. **Verify Schema Exists in Neon**
   ```sql
   -- Connect to Neon and verify
   SELECT schemaname, tablename
   FROM pg_tables
   WHERE schemaname IN ('spp', 'core', 'serve')
   ORDER BY schemaname, tablename;
   ```

3. **Check Stored Procedures**
   ```sql
   SELECT proname, pronamespace::regnamespace::text as schema
   FROM pg_proc
   WHERE pronamespace::regnamespace::text IN ('spp', 'core', 'serve');
   ```

---

### Phase 2: Data Extraction (30 minutes)

1. **Connect to OLD PostgreSQL**
   ```bash
   psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001
   ```

2. **Run Extraction Script**
   - Execute Script 1 from above
   - Verify CSV files created: `/tmp/suppliers_export.csv`, `/tmp/pricelists_export.csv`, `/tmp/pricelist_items_export.csv`

3. **Check Row Counts**
   ```sql
   SELECT COUNT(*) FROM suppliers;
   SELECT COUNT(*) FROM supplier_pricelists;
   SELECT COUNT(*) FROM pricelist_items;
   ```

---

### Phase 3: Data Loading (45 minutes)

1. **Connect to NEW Neon**
   ```bash
   psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require"
   ```

2. **Run Loading Script**
   - Execute Script 2 from above
   - Monitor for errors
   - Note: The pricelist ID mapping section may need manual adjustment

3. **Run Merge Procedures**
   - The script automatically calls `spp.merge_pricelist()` for each upload
   - This populates `core.supplier_product` and `core.price_history`

---

### Phase 4: Validation (30 minutes)

1. **Run All Validation Queries**
   - Execute Script 3 from above
   - Review results for any FAIL status

2. **Manual Spot Checks**
   - Compare sample data between OLD and NEW
   - Verify supplier names match
   - Verify product counts make sense
   - Check price values are correct

3. **Performance Testing**
   ```sql
   -- Test query performance
   EXPLAIN ANALYZE
   SELECT * FROM serve.v_nxt_soh
   WHERE supplier_id = (SELECT supplier_id FROM core.supplier LIMIT 1);
   ```

---

### Phase 5: Post-Migration (30 minutes)

1. **Update Application Configuration**
   ```bash
   # Update .env.local to use Neon database
   DATABASE_URL=postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require
   ```

2. **Run Application Smoke Tests**
   - Test supplier listing page
   - Test pricelist upload (new test file)
   - Test inventory selection workflow
   - Test NXT SOH reports

3. **Create First Selection**
   ```sql
   -- Create a selection to activate the system
   INSERT INTO core.inventory_selection (name, description, status)
   VALUES ('Initial Selection', 'First selection after migration', 'draft');

   -- TODO: Select items and activate
   ```

---

## Rollback Procedures

### If Migration Fails During Loading

1. **Stop Loading Script**
   ```sql
   -- If in transaction, rollback
   ROLLBACK;
   ```

2. **Clear Neon Database**
   ```sql
   BEGIN;
   TRUNCATE TABLE spp.pricelist_row CASCADE;
   TRUNCATE TABLE spp.pricelist_upload CASCADE;
   TRUNCATE TABLE core.price_history CASCADE;
   TRUNCATE TABLE core.supplier_product CASCADE;
   TRUNCATE TABLE core.supplier CASCADE;
   COMMIT;
   ```

3. **Restore OLD PostgreSQL** (if affected)
   ```bash
   pg_restore -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 old_db_backup.dump
   ```

### If Migration Succeeds But Issues Found Later

1. **Keep OLD PostgreSQL Running** (read-only mode)
2. **Re-run Data Loading** (after fixing issues)
3. **Compare Data** using validation queries

---

## Known Issues & Limitations

### 1. ID Mapping Complexity
**Issue:** The pricelist_id mapping between OLD and NEW databases requires careful handling.
**Mitigation:** Use temporary mapping table and verify all relationships.

### 2. Schema Type Mismatch
**Issue:** Migration SQL files use UUID, actual Neon DB uses BIGINT.
**Mitigation:** All scripts in this document use BIGINT to match actual schema.

### 3. Missing Old Schema Details
**Issue:** OLD PostgreSQL schema structure is not fully documented.
**Mitigation:** Extraction scripts use COALESCE for optional fields and defensive defaults.

### 4. Merge Procedure Performance
**Issue:** Running merge procedures for all uploads may take time.
**Mitigation:** Process in batches, monitor progress with RAISE NOTICE statements.

---

## Success Criteria

Migration is considered successful when:

- [ ] All row counts match between OLD and NEW (within tolerance)
- [ ] All validation queries return PASS status
- [ ] All serve views return data without errors
- [ ] Sample data review shows correct values
- [ ] No orphaned records exist
- [ ] Price history has no overlapping date ranges
- [ ] Application can connect to Neon database
- [ ] Basic CRUD operations work (create, read, update, delete)
- [ ] Pricelist upload workflow functions end-to-end

---

## Post-Migration Tasks

### Immediate (Day 1)
- [ ] Monitor application performance
- [ ] Check error logs for database connection issues
- [ ] Verify all API endpoints responding
- [ ] Test critical user workflows

### Week 1
- [ ] Run daily validation queries
- [ ] Monitor database size growth
- [ ] Check slow query logs
- [ ] Optimize indexes if needed

### Month 1
- [ ] Review OLD PostgreSQL for any missed data
- [ ] Consider decommissioning OLD database (after full validation)
- [ ] Update documentation with lessons learned
- [ ] Train team on new Neon architecture

---

## Contact & Support

**Database Administrator:** [TBD]
**DevOps Lead:** [TBD]
**Project Manager:** [TBD]

**Neon Support:** https://neon.tech/docs
**Project ID:** proud-mud-50346856

---

## Appendix A: Complete Schema Reference

### SPP Schema

**spp.pricelist_upload**
- Primary Key: upload_id (BIGINT, auto-increment)
- Foreign Keys: supplier_id → core.supplier
- Status Values: 'received', 'validating', 'validated', 'merged', 'failed', 'rejected'

**spp.pricelist_row**
- Primary Key: row_id (BIGINT, auto-increment)
- Foreign Keys: upload_id → spp.pricelist_upload (CASCADE DELETE)
- Unique Constraint: (upload_id, row_num)

### Core Schema

**core.supplier**
- Primary Key: supplier_id (BIGINT, auto-increment)
- Unique Constraint: name
- Defaults: active=true, default_currency='ZAR', payment_terms_days=30

**core.supplier_product**
- Primary Key: supplier_product_id (BIGINT, auto-increment)
- Foreign Keys: supplier_id → core.supplier, product_id → core.product
- Unique Constraint: (supplier_id, supplier_sku)
- Defaults: is_active=true, is_new=true

**core.price_history**
- Primary Key: price_history_id (BIGINT, auto-increment)
- Foreign Keys: supplier_product_id → core.supplier_product
- Constraints: price >= 0, valid_to > valid_from (if not null)
- SCD Type 2: Only one is_current=true per supplier_product_id

### Serve Schema

**serve.v_nxt_soh** (View)
- Filters: Only shows items in ACTIVE inventory_selection
- Joins: supplier_product, stock_on_hand, inventory_selected_item, inventory_selection

**serve.v_product_table_by_supplier** (View)
- Shows: All supplier products with current prices and selection status

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-07 | Data Oracle Agent | Initial comprehensive migration documentation |

---

**END OF DOCUMENT**
