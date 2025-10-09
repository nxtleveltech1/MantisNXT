-- ============================================================================
-- MantisNXT Purchase Orders Test Suite
-- ============================================================================
-- ADR: ADR-4 (Missing Table Creation)
-- Purpose: Comprehensive testing of purchase_orders table functionality
-- Author: Data Oracle
-- Date: 2025-10-09
-- ============================================================================

BEGIN;

-- Create temporary test schema
CREATE SCHEMA IF NOT EXISTS test_data;

-- ============================================================================
-- TEST 1: Table Structure Verification
-- ============================================================================

DO $$
DECLARE
  v_po_exists BOOLEAN;
  v_poi_exists BOOLEAN;
  v_column_count INTEGER;
BEGIN
  -- Check tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'purchase_orders'
  ) INTO v_po_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'purchase_order_items'
  ) INTO v_poi_exists;

  -- Check column count
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = 'core' AND table_name = 'purchase_orders';

  ASSERT v_po_exists, 'TEST FAILED: purchase_orders table does not exist';
  ASSERT v_poi_exists, 'TEST FAILED: purchase_order_items table does not exist';
  ASSERT v_column_count = 20, FORMAT('TEST FAILED: Expected 20 columns, found %s', v_column_count);

  RAISE NOTICE 'TEST 1 PASSED: Table structure verification ✓';
END $$;

-- ============================================================================
-- TEST 2: Foreign Key Constraints
-- ============================================================================

DO $$
DECLARE
  v_test_supplier_id UUID;
  v_test_product_id UUID;
  v_test_sp_id UUID;
  v_test_po_id UUID;
  v_error_occurred BOOLEAN := false;
BEGIN
  -- Create test supplier
  INSERT INTO core.supplier (name, contact_info)
  VALUES ('Test Supplier for PO', '{"email": "test@example.com"}'::jsonb)
  RETURNING supplier_id INTO v_test_supplier_id;

  -- Create test product
  INSERT INTO core.product (name, description)
  VALUES ('Test Product for PO', 'Test product description')
  RETURNING product_id INTO v_test_product_id;

  -- Create test supplier_product
  INSERT INTO core.supplier_product (supplier_id, product_id, supplier_sku, unit_price)
  VALUES (v_test_supplier_id, v_test_product_id, 'TEST-SKU-001', 100.00)
  RETURNING supplier_product_id INTO v_test_sp_id;

  -- Test 1: Valid foreign key (should succeed)
  INSERT INTO core.purchase_orders (order_number, supplier_id)
  VALUES ('TEST-PO-FK-001', v_test_supplier_id)
  RETURNING purchase_order_id INTO v_test_po_id;

  -- Test 2: Invalid foreign key (should fail)
  BEGIN
    INSERT INTO core.purchase_orders (order_number, supplier_id)
    VALUES ('TEST-PO-FK-002', gen_random_uuid());

    RAISE EXCEPTION 'TEST FAILED: Invalid supplier_id should have been rejected';
  EXCEPTION
    WHEN foreign_key_violation THEN
      v_error_occurred := true;
  END;

  ASSERT v_error_occurred, 'TEST FAILED: Foreign key constraint not working';

  -- Cleanup
  DELETE FROM core.purchase_orders WHERE purchase_order_id = v_test_po_id;
  DELETE FROM core.supplier_product WHERE supplier_product_id = v_test_sp_id;
  DELETE FROM core.product WHERE product_id = v_test_product_id;
  DELETE FROM core.supplier WHERE supplier_id = v_test_supplier_id;

  RAISE NOTICE 'TEST 2 PASSED: Foreign key constraints ✓';
END $$;

-- ============================================================================
-- TEST 3: CHECK Constraints
-- ============================================================================

DO $$
DECLARE
  v_test_supplier_id UUID;
  v_test_po_id UUID;
  v_error_count INTEGER := 0;
BEGIN
  -- Create test supplier
  INSERT INTO core.supplier (name, contact_info)
  VALUES ('Test Supplier for Constraints', '{"email": "test@example.com"}'::jsonb)
  RETURNING supplier_id INTO v_test_supplier_id;

  -- Create valid PO
  INSERT INTO core.purchase_orders (order_number, supplier_id)
  VALUES ('TEST-PO-CHK-001', v_test_supplier_id)
  RETURNING purchase_order_id INTO v_test_po_id;

  -- Test 1: Negative subtotal (should fail)
  BEGIN
    UPDATE core.purchase_orders SET subtotal_amount = -100 WHERE purchase_order_id = v_test_po_id;
    RAISE EXCEPTION 'TEST FAILED: Negative subtotal should have been rejected';
  EXCEPTION
    WHEN check_violation THEN
      v_error_count := v_error_count + 1;
  END;

  -- Test 2: Invalid currency code (should fail)
  BEGIN
    UPDATE core.purchase_orders SET currency_code = 'US' WHERE purchase_order_id = v_test_po_id;
    RAISE EXCEPTION 'TEST FAILED: Invalid currency code should have been rejected';
  EXCEPTION
    WHEN check_violation THEN
      v_error_count := v_error_count + 1;
  END;

  -- Test 3: Expected delivery before order date (should fail)
  BEGIN
    UPDATE core.purchase_orders
    SET expected_delivery_date = order_date - INTERVAL '1 day'
    WHERE purchase_order_id = v_test_po_id;
    RAISE EXCEPTION 'TEST FAILED: Expected delivery before order date should have been rejected';
  EXCEPTION
    WHEN check_violation THEN
      v_error_count := v_error_count + 1;
  END;

  ASSERT v_error_count = 3, FORMAT('TEST FAILED: Expected 3 constraint violations, got %s', v_error_count);

  -- Cleanup
  DELETE FROM core.purchase_orders WHERE purchase_order_id = v_test_po_id;
  DELETE FROM core.supplier WHERE supplier_id = v_test_supplier_id;

  RAISE NOTICE 'TEST 3 PASSED: CHECK constraints ✓';
END $$;

-- ============================================================================
-- TEST 4: Computed Columns (GENERATED ALWAYS)
-- ============================================================================

DO $$
DECLARE
  v_test_supplier_id UUID;
  v_test_product_id UUID;
  v_test_sp_id UUID;
  v_test_po_id UUID;
  v_test_item_id UUID;
  v_total_amount DECIMAL(18,4);
  v_line_total DECIMAL(18,4);
  v_quantity_pending NUMERIC(18,4);
BEGIN
  -- Create test data
  INSERT INTO core.supplier (name, contact_info)
  VALUES ('Test Supplier for Computed', '{"email": "test@example.com"}'::jsonb)
  RETURNING supplier_id INTO v_test_supplier_id;

  INSERT INTO core.product (name, description)
  VALUES ('Test Product for Computed', 'Test')
  RETURNING product_id INTO v_test_product_id;

  INSERT INTO core.supplier_product (supplier_id, product_id, supplier_sku, unit_price)
  VALUES (v_test_supplier_id, v_test_product_id, 'TEST-COMP-001', 50.00)
  RETURNING supplier_product_id INTO v_test_sp_id;

  -- Create PO with amounts
  INSERT INTO core.purchase_orders (
    order_number, supplier_id, subtotal_amount, tax_amount, shipping_amount
  ) VALUES (
    'TEST-PO-COMP-001', v_test_supplier_id, 100.00, 10.00, 5.00
  ) RETURNING purchase_order_id INTO v_test_po_id;

  -- Verify total_amount computation
  SELECT total_amount INTO v_total_amount
  FROM core.purchase_orders
  WHERE purchase_order_id = v_test_po_id;

  ASSERT v_total_amount = 115.00, FORMAT('TEST FAILED: Expected total 115.00, got %s', v_total_amount);

  -- Create PO item
  INSERT INTO core.purchase_order_items (
    purchase_order_id, supplier_product_id, line_number,
    quantity, unit_price, discount_amount
  ) VALUES (
    v_test_po_id, v_test_sp_id, 1, 10, 25.00, 50.00
  ) RETURNING po_item_id INTO v_test_item_id;

  -- Verify line_total computation (10 * 25 - 50 = 200)
  SELECT line_total, quantity_pending INTO v_line_total, v_quantity_pending
  FROM core.purchase_order_items
  WHERE po_item_id = v_test_item_id;

  ASSERT v_line_total = 200.00, FORMAT('TEST FAILED: Expected line total 200.00, got %s', v_line_total);
  ASSERT v_quantity_pending = 10, FORMAT('TEST FAILED: Expected pending quantity 10, got %s', v_quantity_pending);

  -- Update quantity_received
  UPDATE core.purchase_order_items
  SET quantity_received = 6
  WHERE po_item_id = v_test_item_id;

  SELECT quantity_pending INTO v_quantity_pending
  FROM core.purchase_order_items
  WHERE po_item_id = v_test_item_id;

  ASSERT v_quantity_pending = 4, FORMAT('TEST FAILED: Expected pending quantity 4, got %s', v_quantity_pending);

  -- Cleanup
  DELETE FROM core.purchase_order_items WHERE po_item_id = v_test_item_id;
  DELETE FROM core.purchase_orders WHERE purchase_order_id = v_test_po_id;
  DELETE FROM core.supplier_product WHERE supplier_product_id = v_test_sp_id;
  DELETE FROM core.product WHERE product_id = v_test_product_id;
  DELETE FROM core.supplier WHERE supplier_id = v_test_supplier_id;

  RAISE NOTICE 'TEST 4 PASSED: Computed columns ✓';
END $$;

-- ============================================================================
-- TEST 5: Trigger Functions
-- ============================================================================

DO $$
DECLARE
  v_test_supplier_id UUID;
  v_test_product_id UUID;
  v_test_sp_id UUID;
  v_test_po_id UUID;
  v_test_item_id UUID;
  v_created_at TIMESTAMPTZ;
  v_updated_at TIMESTAMPTZ;
  v_subtotal DECIMAL(18,4);
  v_status core.purchase_order_status;
BEGIN
  -- Create test data
  INSERT INTO core.supplier (name, contact_info)
  VALUES ('Test Supplier for Triggers', '{"email": "test@example.com"}'::jsonb)
  RETURNING supplier_id INTO v_test_supplier_id;

  INSERT INTO core.product (name, description)
  VALUES ('Test Product for Triggers', 'Test')
  RETURNING product_id INTO v_test_product_id;

  INSERT INTO core.supplier_product (supplier_id, product_id, supplier_sku, unit_price)
  VALUES (v_test_supplier_id, v_test_product_id, 'TEST-TRIG-001', 100.00)
  RETURNING supplier_product_id INTO v_test_sp_id;

  -- Create PO
  INSERT INTO core.purchase_orders (order_number, supplier_id, status)
  VALUES ('TEST-PO-TRIG-001', v_test_supplier_id, 'pending')
  RETURNING purchase_order_id, created_at INTO v_test_po_id, v_created_at;

  -- Sleep briefly
  PERFORM pg_sleep(0.1);

  -- Update PO
  UPDATE core.purchase_orders SET notes = 'Updated' WHERE purchase_order_id = v_test_po_id;

  -- Verify updated_at changed
  SELECT updated_at INTO v_updated_at FROM core.purchase_orders WHERE purchase_order_id = v_test_po_id;
  ASSERT v_updated_at > v_created_at, 'TEST FAILED: updated_at trigger not working';

  -- Test auto-subtotal update trigger
  INSERT INTO core.purchase_order_items (
    purchase_order_id, supplier_product_id, line_number, quantity, unit_price
  ) VALUES
    (v_test_po_id, v_test_sp_id, 1, 10, 50.00),
    (v_test_po_id, v_test_sp_id, 2, 5, 30.00);

  -- Verify subtotal was auto-updated
  SELECT subtotal_amount INTO v_subtotal FROM core.purchase_orders WHERE purchase_order_id = v_test_po_id;
  ASSERT v_subtotal = 650.00, FORMAT('TEST FAILED: Expected subtotal 650.00, got %s', v_subtotal);

  -- Test auto-completion trigger
  UPDATE core.purchase_order_items
  SET quantity_received = quantity
  WHERE purchase_order_id = v_test_po_id;

  SELECT status INTO v_status FROM core.purchase_orders WHERE purchase_order_id = v_test_po_id;
  ASSERT v_status = 'received', FORMAT('TEST FAILED: Expected status received, got %s', v_status);

  -- Cleanup
  DELETE FROM core.purchase_order_items WHERE purchase_order_id = v_test_po_id;
  DELETE FROM core.purchase_orders WHERE purchase_order_id = v_test_po_id;
  DELETE FROM core.supplier_product WHERE supplier_product_id = v_test_sp_id;
  DELETE FROM core.product WHERE product_id = v_test_product_id;
  DELETE FROM core.supplier WHERE supplier_id = v_test_supplier_id;

  RAISE NOTICE 'TEST 5 PASSED: Trigger functions ✓';
END $$;

-- ============================================================================
-- TEST 6: Helper Functions
-- ============================================================================

DO $$
DECLARE
  v_po_number VARCHAR(50);
  v_test_supplier_id UUID;
  v_test_po_id UUID;
  v_summary RECORD;
BEGIN
  -- Test generate_po_number
  v_po_number := core.generate_po_number();
  ASSERT v_po_number LIKE 'PO-______-____', FORMAT('TEST FAILED: Invalid PO number format: %s', v_po_number);

  -- Test get_purchase_order_summary
  INSERT INTO core.supplier (name, contact_info)
  VALUES ('Test Supplier for Summary', '{"email": "test@example.com"}'::jsonb)
  RETURNING supplier_id INTO v_test_supplier_id;

  INSERT INTO core.purchase_orders (order_number, supplier_id, subtotal_amount)
  VALUES (v_po_number, v_test_supplier_id, 1000.00)
  RETURNING purchase_order_id INTO v_test_po_id;

  SELECT * INTO v_summary FROM core.get_purchase_order_summary(v_test_po_id);

  ASSERT v_summary.order_number = v_po_number, 'TEST FAILED: Summary function returned wrong order';
  ASSERT v_summary.total_amount = 1000.00, FORMAT('TEST FAILED: Expected total 1000.00, got %s', v_summary.total_amount);

  -- Cleanup
  DELETE FROM core.purchase_orders WHERE purchase_order_id = v_test_po_id;
  DELETE FROM core.supplier WHERE supplier_id = v_test_supplier_id;

  RAISE NOTICE 'TEST 6 PASSED: Helper functions ✓';
END $$;

-- ============================================================================
-- TEST 7: Index Verification
-- ============================================================================

DO $$
DECLARE
  v_index_count INTEGER;
BEGIN
  -- Count indexes on purchase_orders
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'core'
  AND tablename = 'purchase_orders';

  ASSERT v_index_count >= 8, FORMAT('TEST FAILED: Expected at least 8 indexes on purchase_orders, found %s', v_index_count);

  -- Count indexes on purchase_order_items
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'core'
  AND tablename = 'purchase_order_items';

  ASSERT v_index_count >= 4, FORMAT('TEST FAILED: Expected at least 4 indexes on purchase_order_items, found %s', v_index_count);

  RAISE NOTICE 'TEST 7 PASSED: Index verification ✓';
END $$;

-- ============================================================================
-- TEST 8: Cascade Deletes
-- ============================================================================

DO $$
DECLARE
  v_test_supplier_id UUID;
  v_test_product_id UUID;
  v_test_sp_id UUID;
  v_test_po_id UUID;
  v_item_count INTEGER;
BEGIN
  -- Create test data
  INSERT INTO core.supplier (name, contact_info)
  VALUES ('Test Supplier for Cascade', '{"email": "test@example.com"}'::jsonb)
  RETURNING supplier_id INTO v_test_supplier_id;

  INSERT INTO core.product (name, description)
  VALUES ('Test Product for Cascade', 'Test')
  RETURNING product_id INTO v_test_product_id;

  INSERT INTO core.supplier_product (supplier_id, product_id, supplier_sku, unit_price)
  VALUES (v_test_supplier_id, v_test_product_id, 'TEST-CASCADE-001', 100.00)
  RETURNING supplier_product_id INTO v_test_sp_id;

  INSERT INTO core.purchase_orders (order_number, supplier_id)
  VALUES ('TEST-PO-CASCADE-001', v_test_supplier_id)
  RETURNING purchase_order_id INTO v_test_po_id;

  INSERT INTO core.purchase_order_items (
    purchase_order_id, supplier_product_id, line_number, quantity, unit_price
  ) VALUES
    (v_test_po_id, v_test_sp_id, 1, 10, 50.00),
    (v_test_po_id, v_test_sp_id, 2, 5, 30.00);

  -- Delete PO (should cascade to items)
  DELETE FROM core.purchase_orders WHERE purchase_order_id = v_test_po_id;

  -- Verify items were deleted
  SELECT COUNT(*) INTO v_item_count
  FROM core.purchase_order_items
  WHERE purchase_order_id = v_test_po_id;

  ASSERT v_item_count = 0, 'TEST FAILED: Cascade delete did not remove items';

  -- Cleanup
  DELETE FROM core.supplier_product WHERE supplier_product_id = v_test_sp_id;
  DELETE FROM core.product WHERE product_id = v_test_product_id;
  DELETE FROM core.supplier WHERE supplier_id = v_test_supplier_id;

  RAISE NOTICE 'TEST 8 PASSED: Cascade deletes ✓';
END $$;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'ALL PURCHASE ORDERS TESTS PASSED ✓';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Tests completed: 8/8';
  RAISE NOTICE '  - Table structure verification';
  RAISE NOTICE '  - Foreign key constraints';
  RAISE NOTICE '  - CHECK constraints';
  RAISE NOTICE '  - Computed columns';
  RAISE NOTICE '  - Trigger functions';
  RAISE NOTICE '  - Helper functions';
  RAISE NOTICE '  - Index verification';
  RAISE NOTICE '  - Cascade deletes';
  RAISE NOTICE '==================================================';
END $$;

ROLLBACK;

-- ============================================================================
-- END OF TEST SUITE
-- ============================================================================
