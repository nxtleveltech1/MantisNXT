-- Supplier policies
DROP POLICY IF EXISTS "supplier_org_isolation" ON supplier;
CREATE POLICY "supplier_org_isolation" ON supplier
    FOR ALL USING (org_id = auth.user_org_id());

DROP POLICY IF EXISTS "supplier_modify_ops_admin" ON supplier;
CREATE POLICY "supplier_modify_ops_admin" ON supplier
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

DROP POLICY IF EXISTS "supplier_update_ops_admin" ON supplier;
CREATE POLICY "supplier_update_ops_admin" ON supplier
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

DROP POLICY IF EXISTS "supplier_delete_ops_admin" ON supplier;
CREATE POLICY "supplier_delete_ops_admin" ON supplier
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

-- Inventory item policies
DROP POLICY IF EXISTS "inventory_item_org_isolation" ON inventory_item;
CREATE POLICY "inventory_item_org_isolation" ON inventory_item
    FOR ALL USING (org_id = auth.user_org_id());

-- Purchase order policies
DROP POLICY IF EXISTS "purchase_order_org_isolation" ON purchase_order;
CREATE POLICY "purchase_order_org_isolation" ON purchase_order
    FOR ALL USING (org_id = auth.user_org_id());

DROP POLICY IF EXISTS "purchase_order_item_access" ON purchase_order_item;
CREATE POLICY "purchase_order_item_access" ON purchase_order_item
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM purchase_order po
            WHERE po.id = purchase_order_id
            AND po.org_id = auth.user_org_id()
        )
    );

