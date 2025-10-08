-- =====================================================
-- MANTIS NXT DATABASE BACKUP SCRIPT
-- =====================================================
-- Agent 1: Database Analysis Specialist
-- Purpose: Backup all current data before deduplication
-- Generated: 2025-09-29
-- =====================================================

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_before_dedup;

-- Set search path to include backup schema
SET search_path TO backup_before_dedup, public;

-- =====================================================
-- BACKUP SUPPLIER TABLE
-- =====================================================
CREATE TABLE backup_before_dedup.supplier AS 
SELECT * FROM public.supplier;

-- Add metadata
ALTER TABLE backup_before_dedup.supplier 
ADD COLUMN backup_timestamp timestamptz DEFAULT now(),
ADD COLUMN backup_reason text DEFAULT 'Pre-deduplication backup';

-- Create indexes on backup
CREATE INDEX idx_backup_supplier_id ON backup_before_dedup.supplier(id);
CREATE INDEX idx_backup_supplier_name ON backup_before_dedup.supplier(name);

-- =====================================================
-- BACKUP INVENTORY_ITEM TABLE
-- =====================================================
CREATE TABLE backup_before_dedup.inventory_item AS 
SELECT * FROM public.inventory_item;

ALTER TABLE backup_before_dedup.inventory_item 
ADD COLUMN backup_timestamp timestamptz DEFAULT now(),
ADD COLUMN backup_reason text DEFAULT 'Pre-deduplication backup';

CREATE INDEX idx_backup_inventory_item_id ON backup_before_dedup.inventory_item(id);
CREATE INDEX idx_backup_inventory_item_supplier_id ON backup_before_dedup.inventory_item(supplier_id);

-- =====================================================
-- BACKUP PURCHASE_ORDER TABLE
-- =====================================================
CREATE TABLE backup_before_dedup.purchase_order AS 
SELECT * FROM public.purchase_order;

ALTER TABLE backup_before_dedup.purchase_order 
ADD COLUMN backup_timestamp timestamptz DEFAULT now(),
ADD COLUMN backup_reason text DEFAULT 'Pre-deduplication backup';

CREATE INDEX idx_backup_purchase_order_id ON backup_before_dedup.purchase_order(id);
CREATE INDEX idx_backup_purchase_order_supplier_id ON backup_before_dedup.purchase_order(supplier_id);

-- =====================================================
-- BACKUP PURCHASE_ORDER_ITEM TABLE
-- =====================================================
CREATE TABLE backup_before_dedup.purchase_order_item AS 
SELECT * FROM public.purchase_order_item;

ALTER TABLE backup_before_dedup.purchase_order_item 
ADD COLUMN backup_timestamp timestamptz DEFAULT now(),
ADD COLUMN backup_reason text DEFAULT 'Pre-deduplication backup';

CREATE INDEX idx_backup_purchase_order_item_id ON backup_before_dedup.purchase_order_item(id);

-- =====================================================
-- BACKUP PRODUCT TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product') THEN
        CREATE TABLE backup_before_dedup.product AS 
        SELECT * FROM public.product;
        
        ALTER TABLE backup_before_dedup.product 
        ADD COLUMN backup_timestamp timestamptz DEFAULT now(),
        ADD COLUMN backup_reason text DEFAULT 'Pre-deduplication backup';
        
        CREATE INDEX idx_backup_product_id ON backup_before_dedup.product(id);
    END IF;
END $$;

-- =====================================================
-- BACKUP INVOICE TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice') THEN
        CREATE TABLE backup_before_dedup.invoice AS 
        SELECT * FROM public.invoice;
        
        ALTER TABLE backup_before_dedup.invoice 
        ADD COLUMN backup_timestamp timestamptz DEFAULT now(),
        ADD COLUMN backup_reason text DEFAULT 'Pre-deduplication backup';
        
        CREATE INDEX idx_backup_invoice_id ON backup_before_dedup.invoice(id);
    END IF;
END $$;

-- =====================================================
-- CREATE BACKUP SUMMARY TABLE
-- =====================================================
CREATE TABLE backup_before_dedup.backup_summary (
    table_name text PRIMARY KEY,
    record_count bigint,
    backup_timestamp timestamptz DEFAULT now(),
    notes text
);

-- Populate backup summary
INSERT INTO backup_before_dedup.backup_summary (table_name, record_count, notes)
SELECT 'supplier', COUNT(*), 'Original supplier records before deduplication' FROM backup_before_dedup.supplier
UNION ALL
SELECT 'inventory_item', COUNT(*), 'Original inventory items with supplier references' FROM backup_before_dedup.inventory_item
UNION ALL
SELECT 'purchase_order', COUNT(*), 'Original purchase orders with supplier references' FROM backup_before_dedup.purchase_order
UNION ALL
SELECT 'purchase_order_item', COUNT(*), 'Original purchase order line items' FROM backup_before_dedup.purchase_order_item;

-- Add product and invoice counts if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'backup_before_dedup' AND table_name = 'product') THEN
        INSERT INTO backup_before_dedup.backup_summary (table_name, record_count, notes)
        SELECT 'product', COUNT(*), 'Original product records' FROM backup_before_dedup.product;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'backup_before_dedup' AND table_name = 'invoice') THEN
        INSERT INTO backup_before_dedup.backup_summary (table_name, record_count, notes)
        SELECT 'invoice', COUNT(*), 'Original invoice records' FROM backup_before_dedup.invoice;
    END IF;
END $$;

-- =====================================================
-- VERIFY BACKUP COMPLETENESS
-- =====================================================
SELECT 
    'Backup completed at: ' || now()::text as status,
    'Total tables backed up: ' || COUNT(*)::text as tables_count,
    'Total records backed up: ' || SUM(record_count)::text as total_records
FROM backup_before_dedup.backup_summary;

-- Show backup summary
SELECT * FROM backup_before_dedup.backup_summary ORDER BY table_name;

-- =====================================================
-- ROLLBACK SCRIPT (Save this separately)
-- =====================================================
-- To restore from backup, use:
/*
-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Restore tables
TRUNCATE public.supplier CASCADE;
INSERT INTO public.supplier SELECT * FROM backup_before_dedup.supplier;

TRUNCATE public.inventory_item CASCADE;
INSERT INTO public.inventory_item SELECT * FROM backup_before_dedup.inventory_item;

TRUNCATE public.purchase_order CASCADE;
INSERT INTO public.purchase_order SELECT * FROM backup_before_dedup.purchase_order;

TRUNCATE public.purchase_order_item CASCADE;
INSERT INTO public.purchase_order_item SELECT * FROM backup_before_dedup.purchase_order_item;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Verify restoration
SELECT 'Restored' as status, COUNT(*) FROM public.supplier;
*/