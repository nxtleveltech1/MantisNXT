-- Migration: 0008_views_rpc.sql
-- Description: Read-optimized views and RPC functions for Angular frontend
-- up

-- =======================
-- VIEWS FOR ANGULAR FRONTEND
-- =======================

-- Organization overview view
CREATE OR REPLACE VIEW v_organization_overview AS
SELECT
    o.id,
    o.name,
    o.slug,
    o.plan_type,
    o.created_at,
    COUNT(DISTINCT p.id) as user_count,
    COUNT(DISTINCT c.id) as customer_count,
    COUNT(DISTINCT st.id) as open_tickets,
    COUNT(DISTINCT d.id) as dashboard_count
FROM organization o
LEFT JOIN profile p ON p.org_id = o.id AND p.is_active = true
LEFT JOIN customer c ON c.org_id = o.id AND c.status = 'active'
LEFT JOIN support_ticket st ON st.org_id = o.id AND st.status IN ('open', 'in_progress')
LEFT JOIN dashboard d ON d.org_id = o.id
GROUP BY o.id, o.name, o.slug, o.plan_type, o.created_at;

-- User profile with organization details
CREATE OR REPLACE VIEW v_user_profile AS
SELECT
    p.id,
    p.org_id,
    p.role,
    p.display_name,
    p.avatar_url,
    p.last_seen_at,
    p.is_active,
    p.created_at,
    o.name as org_name,
    o.slug as org_slug,
    o.plan_type as org_plan
FROM profile p
JOIN organization o ON o.id = p.org_id;

-- Supply chain dashboard view
CREATE OR REPLACE VIEW v_supply_chain_overview AS
SELECT
    s.org_id,
    COUNT(DISTINCT s.id) as supplier_count,
    COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_suppliers,
    COUNT(DISTINCT ii.id) as inventory_items,
    COUNT(DISTINCT CASE WHEN ii.quantity_on_hand <= ii.reorder_point THEN ii.id END) as low_stock_items,
    COUNT(DISTINCT po.id) as total_pos,
    COUNT(DISTINCT CASE WHEN po.status = 'pending_approval' THEN po.id END) as pending_pos,
    COALESCE(SUM(CASE WHEN po.status IN ('approved', 'sent') THEN po.total_amount END), 0) as pending_po_value
FROM supplier s
LEFT JOIN inventory_item ii ON ii.supplier_id = s.id
LEFT JOIN purchase_order po ON po.supplier_id = s.id
WHERE s.org_id = auth.user_org_id()
GROUP BY s.org_id;

-- Customer operations dashboard view
CREATE OR REPLACE VIEW v_customer_ops_overview AS
SELECT
    c.org_id,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_customers,
    COUNT(DISTINCT CASE WHEN c.acquisition_date >= CURRENT_DATE - INTERVAL '30 days' THEN c.id END) as new_customers_30d,
    SUM(c.lifetime_value) as total_ltv,
    COUNT(DISTINCT st.id) as total_tickets,
    COUNT(DISTINCT CASE WHEN st.status IN ('open', 'in_progress') THEN st.id END) as open_tickets,
    COUNT(DISTINCT CASE WHEN st.priority = 'critical' AND st.status IN ('open', 'in_progress') THEN st.id END) as critical_tickets,
    AVG(EXTRACT(EPOCH FROM (COALESCE(st.first_response_at, now()) - st.created_at))/3600) as avg_first_response_hours
FROM customer c
LEFT JOIN support_ticket st ON st.customer_id = c.id
WHERE c.org_id = auth.user_org_id()
GROUP BY c.org_id;

-- AI workspace statistics view
CREATE OR REPLACE VIEW v_ai_workspace_stats AS
SELECT
    ac.org_id,
    COUNT(DISTINCT ac.id) as total_conversations,
    COUNT(DISTINCT CASE WHEN ac.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN ac.id END) as conversations_7d,
    SUM(ac.total_tokens_used) as total_tokens,
    COUNT(DISTINCT ad.id) as datasets_count,
    COUNT(DISTINCT apt.id) as prompt_templates_count,
    COUNT(DISTINCT CASE WHEN apt.is_public = true THEN apt.id END) as public_templates
FROM ai_conversation ac
LEFT JOIN ai_dataset ad ON ad.org_id = ac.org_id
LEFT JOIN ai_prompt_template apt ON apt.org_id = ac.org_id
WHERE ac.org_id = auth.user_org_id()
GROUP BY ac.org_id;

-- Recent activity view for dashboard
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT
    'ticket' as activity_type,
    st.id as record_id,
    st.title as title,
    'Support ticket created' as description,
    st.created_at as timestamp,
    p.display_name as user_name,
    st.org_id
FROM support_ticket st
LEFT JOIN profile p ON p.id = st.assigned_to
WHERE st.org_id = auth.user_org_id()

UNION ALL

SELECT
    'purchase_order' as activity_type,
    po.id as record_id,
    po.po_number as title,
    'Purchase order created' as description,
    po.created_at as timestamp,
    p.display_name as user_name,
    po.org_id
FROM purchase_order po
LEFT JOIN profile p ON p.id = po.created_by
WHERE po.org_id = auth.user_org_id()

UNION ALL

SELECT
    'ai_conversation' as activity_type,
    ac.id as record_id,
    ac.title as title,
    'AI conversation started' as description,
    ac.created_at as timestamp,
    p.display_name as user_name,
    ac.org_id
FROM ai_conversation ac
JOIN profile p ON p.id = ac.user_id
WHERE ac.org_id = auth.user_org_id()

ORDER BY timestamp DESC
LIMIT 50;

-- Inventory low stock alert view
CREATE OR REPLACE VIEW v_inventory_alerts AS
SELECT
    ii.id,
    ii.sku,
    ii.name,
    ii.quantity_on_hand,
    ii.reorder_point,
    ii.unit_price,
    s.name as supplier_name,
    s.lead_time_days,
    CASE
        WHEN ii.quantity_on_hand = 0 THEN 'out_of_stock'
        WHEN ii.quantity_on_hand <= ii.reorder_point THEN 'low_stock'
        ELSE 'normal'
    END as stock_status
FROM inventory_item ii
LEFT JOIN supplier s ON s.id = ii.supplier_id
WHERE ii.org_id = auth.user_org_id()
AND ii.is_active = true
AND ii.quantity_on_hand <= ii.reorder_point
ORDER BY ii.quantity_on_hand ASC, ii.reorder_point DESC;

-- =======================
-- RPC FUNCTIONS
-- =======================

-- Get dashboard data for a specific widget
CREATE OR REPLACE FUNCTION get_widget_data(widget_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    widget_config jsonb;
    result_data jsonb;
    cache_record widget_data_cache%ROWTYPE;
BEGIN
    -- Check if user has access to this widget
    SELECT w.config INTO widget_config
    FROM widget w
    JOIN dashboard d ON d.id = w.dashboard_id
    WHERE w.id = widget_id_param
    AND w.org_id = auth.user_org_id();

    IF widget_config IS NULL THEN
        RAISE EXCEPTION 'Widget not found or access denied';
    END IF;

    -- Check cache first
    SELECT * INTO cache_record
    FROM widget_data_cache
    WHERE widget_id = widget_id_param
    AND expires_at > now();

    IF cache_record.id IS NOT NULL THEN
        RETURN cache_record.cached_data;
    END IF;

    -- Generate data based on widget type and config
    -- This is a simplified example - extend based on actual widget types
    IF widget_config->>'type' = 'kpi_card' THEN
        CASE widget_config->>'metric'
            WHEN 'total_customers' THEN
                SELECT jsonb_build_object('value', COUNT(*), 'label', 'Total Customers')
                INTO result_data
                FROM customer
                WHERE org_id = auth.user_org_id();
            WHEN 'open_tickets' THEN
                SELECT jsonb_build_object('value', COUNT(*), 'label', 'Open Tickets')
                INTO result_data
                FROM support_ticket
                WHERE org_id = auth.user_org_id()
                AND status IN ('open', 'in_progress');
            ELSE
                result_data := jsonb_build_object('value', 0, 'label', 'Unknown Metric');
        END CASE;
    ELSE
        result_data := jsonb_build_object('message', 'Widget type not implemented');
    END IF;

    -- Cache the result
    INSERT INTO widget_data_cache (widget_id, data_hash, cached_data, expires_at)
    VALUES (
        widget_id_param,
        md5(result_data::text),
        result_data,
        now() + interval '5 minutes'
    );

    RETURN result_data;
END;
$$;

-- Search function for global search
CREATE OR REPLACE FUNCTION global_search(search_term text, limit_param integer DEFAULT 20)
RETURNS TABLE(
    entity_type text,
    entity_id uuid,
    title text,
    description text,
    url text,
    relevance_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Search customers
    SELECT
        'customer'::text,
        c.id,
        c.name,
        COALESCE(c.company, c.email),
        '/customers/' || c.id::text,
        ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.company, '') || ' ' || COALESCE(c.email, '')), plainto_tsquery('english', search_term))
    FROM customer c
    WHERE c.org_id = auth.user_org_id()
    AND (
        c.name ILIKE '%' || search_term || '%' OR
        c.company ILIKE '%' || search_term || '%' OR
        c.email ILIKE '%' || search_term || '%'
    )

    UNION ALL

    -- Search support tickets
    SELECT
        'ticket'::text,
        st.id,
        st.title,
        LEFT(st.description, 200),
        '/tickets/' || st.id::text,
        ts_rank(to_tsvector('english', st.title || ' ' || st.description), plainto_tsquery('english', search_term))
    FROM support_ticket st
    WHERE st.org_id = auth.user_org_id()
    AND (
        st.title ILIKE '%' || search_term || '%' OR
        st.description ILIKE '%' || search_term || '%' OR
        st.ticket_number ILIKE '%' || search_term || '%'
    )

    UNION ALL

    -- Search inventory items
    SELECT
        'inventory'::text,
        ii.id,
        ii.name,
        COALESCE(ii.description, ii.sku),
        '/inventory/' || ii.id::text,
        ts_rank(to_tsvector('english', ii.name || ' ' || COALESCE(ii.description, '') || ' ' || ii.sku), plainto_tsquery('english', search_term))
    FROM inventory_item ii
    WHERE ii.org_id = auth.user_org_id()
    AND ii.is_active = true
    AND (
        ii.name ILIKE '%' || search_term || '%' OR
        ii.description ILIKE '%' || search_term || '%' OR
        ii.sku ILIKE '%' || search_term || '%'
    )

    ORDER BY relevance_score DESC
    LIMIT limit_param;
END;
$$;

-- Get organization metrics for executive dashboard
CREATE OR REPLACE FUNCTION get_org_metrics(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    start_date date;
BEGIN
    start_date := CURRENT_DATE - days_back;

    WITH metrics AS (
        SELECT
            COUNT(DISTINCT c.id) as total_customers,
            COUNT(DISTINCT CASE WHEN c.acquisition_date >= start_date THEN c.id END) as new_customers,
            COUNT(DISTINCT st.id) as total_tickets,
            COUNT(DISTINCT CASE WHEN st.created_at >= start_date THEN st.id END) as new_tickets,
            COUNT(DISTINCT CASE WHEN st.status IN ('open', 'in_progress') THEN st.id END) as open_tickets,
            COALESCE(SUM(po.total_amount), 0) as total_po_value,
            COUNT(DISTINCT po.id) as total_pos,
            COUNT(DISTINCT ii.id) as inventory_items,
            COUNT(DISTINCT CASE WHEN ii.quantity_on_hand <= ii.reorder_point THEN ii.id END) as low_stock_items
        FROM customer c
        FULL OUTER JOIN support_ticket st ON st.org_id = c.org_id
        FULL OUTER JOIN purchase_order po ON po.org_id = COALESCE(c.org_id, st.org_id)
        FULL OUTER JOIN inventory_item ii ON ii.org_id = COALESCE(c.org_id, st.org_id, po.org_id)
        WHERE COALESCE(c.org_id, st.org_id, po.org_id, ii.org_id) = auth.user_org_id()
    )
    SELECT jsonb_build_object(
        'customers', jsonb_build_object(
            'total', total_customers,
            'new', new_customers
        ),
        'support', jsonb_build_object(
            'total_tickets', total_tickets,
            'new_tickets', new_tickets,
            'open_tickets', open_tickets
        ),
        'supply_chain', jsonb_build_object(
            'total_po_value', total_po_value,
            'total_pos', total_pos,
            'inventory_items', inventory_items,
            'low_stock_items', low_stock_items
        ),
        'period_days', days_back
    )
    INTO result
    FROM metrics;

    RETURN result;
END;
$$;

-- Bulk update ticket status
CREATE OR REPLACE FUNCTION bulk_update_tickets(ticket_ids uuid[], new_status ticket_status, assigned_to_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE support_ticket
    SET
        status = new_status,
        assigned_to = COALESCE(assigned_to_id, assigned_to),
        updated_at = now()
    WHERE id = ANY(ticket_ids)
    AND org_id = auth.user_org_id()
    AND (assigned_to = auth.uid() OR auth.has_role(ARRAY['admin', 'ops_manager']));

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- Generate inventory reorder suggestions
CREATE OR REPLACE FUNCTION get_reorder_suggestions()
RETURNS TABLE(
    item_id uuid,
    sku text,
    item_name text,
    current_stock integer,
    reorder_point integer,
    suggested_quantity integer,
    supplier_name text,
    lead_time_days integer,
    estimated_cost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ii.id,
        ii.sku,
        ii.name,
        ii.quantity_on_hand,
        ii.reorder_point,
        GREATEST(ii.reorder_point * 2 - ii.quantity_on_hand, ii.reorder_point) as suggested_quantity,
        s.name,
        s.lead_time_days,
        ii.unit_price * GREATEST(ii.reorder_point * 2 - ii.quantity_on_hand, ii.reorder_point)
    FROM inventory_item ii
    LEFT JOIN supplier s ON s.id = ii.supplier_id
    WHERE ii.org_id = auth.user_org_id()
    AND ii.is_active = true
    AND ii.quantity_on_hand <= ii.reorder_point
    ORDER BY ii.quantity_on_hand ASC;
END;
$$;

-- =======================
-- GRANT PERMISSIONS
-- =======================

-- Grant execute permissions on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION get_widget_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION global_search(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_metrics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_tickets(uuid[], ticket_status, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reorder_suggestions() TO authenticated;

-- Grant select on views to authenticated users
GRANT SELECT ON v_organization_overview TO authenticated;
GRANT SELECT ON v_user_profile TO authenticated;
GRANT SELECT ON v_supply_chain_overview TO authenticated;
GRANT SELECT ON v_customer_ops_overview TO authenticated;
GRANT SELECT ON v_ai_workspace_stats TO authenticated;
GRANT SELECT ON v_recent_activity TO authenticated;
GRANT SELECT ON v_inventory_alerts TO authenticated;

-- down

-- Drop grants
REVOKE ALL ON FUNCTION get_reorder_suggestions() FROM authenticated;
REVOKE ALL ON FUNCTION bulk_update_tickets(uuid[], ticket_status, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION get_org_metrics(integer) FROM authenticated;
REVOKE ALL ON FUNCTION global_search(text, integer) FROM authenticated;
REVOKE ALL ON FUNCTION get_widget_data(uuid) FROM authenticated;

REVOKE ALL ON v_inventory_alerts FROM authenticated;
REVOKE ALL ON v_recent_activity FROM authenticated;
REVOKE ALL ON v_ai_workspace_stats FROM authenticated;
REVOKE ALL ON v_customer_ops_overview FROM authenticated;
REVOKE ALL ON v_supply_chain_overview FROM authenticated;
REVOKE ALL ON v_user_profile FROM authenticated;
REVOKE ALL ON v_organization_overview FROM authenticated;

-- Drop functions
DROP FUNCTION IF EXISTS get_reorder_suggestions();
DROP FUNCTION IF EXISTS bulk_update_tickets(uuid[], ticket_status, uuid);
DROP FUNCTION IF EXISTS get_org_metrics(integer);
DROP FUNCTION IF EXISTS global_search(text, integer);
DROP FUNCTION IF EXISTS get_widget_data(uuid);

-- Drop views
DROP VIEW IF EXISTS v_inventory_alerts;
DROP VIEW IF EXISTS v_recent_activity;
DROP VIEW IF EXISTS v_ai_workspace_stats;
DROP VIEW IF EXISTS v_customer_ops_overview;
DROP VIEW IF EXISTS v_supply_chain_overview;
DROP VIEW IF EXISTS v_user_profile;
DROP VIEW IF EXISTS v_organization_overview;