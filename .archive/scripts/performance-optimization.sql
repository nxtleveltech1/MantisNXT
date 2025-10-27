-- Standard performance indexes for MantisNXT
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_sku_active ON inventory_items (sku) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_code_active ON suppliers (supplier_code) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_item_date ON stock_movements (inventory_item_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_active ON users (organization_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_orders_customer_date ON sales_orders (customer_id, order_date);
