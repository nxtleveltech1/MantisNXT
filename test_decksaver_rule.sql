-- Test Decksaver rule for supplier rules functionality testing
INSERT INTO spp.supplier_rules (
    supplier_id, 
    rule_name, 
    rule_type, 
    trigger_event, 
    execution_order, 
    is_blocking, 
    rule_config
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000', -- Test supplier ID
    'Decksaver join sheets test', 
    'transformation', 
    'pricelist_upload', 
    1, 
    false, 
    '{
        "type": "join_sheets",
        "left_sheet": "main",
        "right_sheet": "pricing", 
        "join_on": {
            "left": "sku",
            "right": "supplier_sku"
        },
        "left_columns": ["supplier_sku", "name", "category_raw", "stock_on_hand"],
        "right_columns": ["cost_price_ex_vat", "vat_rate"],
        "vat_policy": {
            "rate": 0.15,
            "mode": "detect"
        }
    }'::jsonb
) ON CONFLICT DO NOTHING;