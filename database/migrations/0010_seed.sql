-- Migration: 0010_seed.sql
-- Description: Seed data for demo dashboards and E2E tests with realistic multi-tenant data
-- up

-- =======================
-- SEED ORGANIZATIONS
-- =======================

-- Insert two demo organizations
INSERT INTO organization (id, name, slug, plan_type, settings) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'TechCorp Industries', 'techcorp', 'enterprise', '{"features": ["ai_workspace", "advanced_analytics"], "limits": {"users": 1000, "storage_gb": 1000}}'),
('b2c3d4e5-f6a7-8901-bcde-f21234567890', 'StartupHub LLC', 'startuphub', 'professional', '{"features": ["supply_chain", "customer_ops"], "limits": {"users": 50, "storage_gb": 100}}')
ON CONFLICT (id) DO NOTHING;

-- =======================
-- SEED USER PROFILES
-- =======================

-- Note: In real deployment, these would be created after auth users exist
-- For demo purposes, we'll create placeholder profiles with synthetic UUIDs

INSERT INTO profile (id, org_id, role, display_name, avatar_url, settings) VALUES
-- TechCorp users
('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin', 'Alice Johnson', 'https://ui-avatars.com/api/?name=Alice+Johnson', '{"timezone": "America/New_York", "notifications": {"email": true, "push": true}}'),
('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'manager', 'Bob Chen', 'https://ui-avatars.com/api/?name=Bob+Chen', '{"timezone": "America/Los_Angeles", "notifications": {"email": true, "push": false}}'),
('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'user', 'Carol Martinez', 'https://ui-avatars.com/api/?name=Carol+Martinez', '{"timezone": "America/Chicago", "theme": "dark"}'),
('44444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'user', 'David Kim', 'https://ui-avatars.com/api/?name=David+Kim', '{"timezone": "America/New_York", "language": "en"}'),

-- StartupHub users
('55555555-5555-5555-5555-555555555555', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'admin', 'Emma Wilson', 'https://ui-avatars.com/api/?name=Emma+Wilson', '{"timezone": "Europe/London", "notifications": {"email": true, "push": true}}'),
('66666666-6666-6666-6666-666666666666', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'manager', 'Frank Rodriguez', 'https://ui-avatars.com/api/?name=Frank+Rodriguez', '{"timezone": "America/Denver", "theme": "light"}'),
('77777777-7777-7777-7777-777777777777', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'user', 'Grace Lee', 'https://ui-avatars.com/api/?name=Grace+Lee', '{"timezone": "Asia/Seoul", "language": "ko"}')
ON CONFLICT (id) DO NOTHING;

-- =======================
-- SEED SUPPLY CHAIN DATA
-- =======================

-- Suppliers for both organizations
INSERT INTO supplier (id, org_id, name, contact_email, contact_phone, address, risk_score, status, payment_terms, lead_time_days, certifications) VALUES
-- TechCorp suppliers
('aaaa1111-bbbb-2222-cccc-333344445555', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Global Electronics Supply Co', 'orders@globalelectronics.com', '+1-555-0101', '{"street": "123 Industrial Blvd", "city": "San Jose", "state": "CA", "zip": "95110", "country": "USA"}', 25, 'active', 'Net 30', 14, '{"ISO-9001", "RoHS"}'),
('aaaa2222-bbbb-3333-cccc-444455556666', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Premium Components Ltd', 'sales@premiumcomp.com', '+1-555-0102', '{"street": "456 Tech Park Dr", "city": "Austin", "state": "TX", "zip": "78759", "country": "USA"}', 15, 'active', 'Net 45', 21, '{"ISO-14001", "IATF-16949"}'),
('aaaa3333-bbbb-4444-cccc-555566667777', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Budget Parts Warehouse', 'info@budgetparts.com', '+1-555-0103', '{"street": "789 Commerce Way", "city": "Phoenix", "state": "AZ", "zip": "85001", "country": "USA"}', 65, 'active', 'Net 15', 7, '{}'),

-- StartupHub suppliers
('bbbb1111-cccc-2222-dddd-333344445555', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'Local Office Supplies', 'orders@localoffice.com', '+1-555-0201', '{"street": "321 Main St", "city": "Denver", "state": "CO", "zip": "80202", "country": "USA"}', 30, 'active', 'Net 30', 5, '{}'),
('bbbb2222-cccc-3333-dddd-444455556666', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'Tech Solutions Inc', 'support@techsolutions.com', '+1-555-0202', '{"street": "654 Innovation Ave", "city": "Seattle", "state": "WA", "zip": "98101", "country": "USA"}', 20, 'active', 'Net 45', 10, '{"ISO-27001"}')
ON CONFLICT (id) DO NOTHING;

-- Inventory items
INSERT INTO inventory_item (id, org_id, sku, name, description, category, unit_price, quantity_on_hand, reorder_point, max_stock_level, supplier_id, location) VALUES
-- TechCorp inventory
('inv11111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CPU-001', 'Intel Core i7-13700K Processor', 'High-performance 13th gen Intel processor', 'components', 389.99, 125, 50, 500, 'aaaa1111-bbbb-2222-cccc-333344445555', 'Warehouse-A-B3'),
('inv22222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RAM-001', 'Corsair Vengeance 32GB DDR5', '32GB DDR5-5600 Memory Kit', 'components', 159.99, 85, 30, 300, 'aaaa1111-bbbb-2222-cccc-333344445555', 'Warehouse-A-C1'),
('inv33333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'SSD-001', 'Samsung 980 PRO 2TB SSD', 'NVMe PCIe 4.0 M.2 SSD', 'components', 199.99, 45, 25, 200, 'aaaa2222-bbbb-3333-cccc-444455556666', 'Warehouse-A-D2'),
('inv44444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CASE-001', 'Fractal Design Define 7', 'Mid-tower PC case with noise dampening', 'components', 149.99, 15, 20, 100, 'aaaa3333-bbbb-4444-cccc-555566667777', 'Warehouse-B-A1'),

-- StartupHub inventory
('inv55555-5555-5555-5555-555555555555', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'OFF-001', 'A4 Copy Paper (500 sheets)', 'White multipurpose copy paper', 'consumables', 8.99, 150, 50, 500, 'bbbb1111-cccc-2222-dddd-333344445555', 'Office-Storage'),
('inv66666-6666-6666-6666-666666666666', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'OFF-002', 'Blue Ballpoint Pens (Pack of 12)', 'Medium point blue ink pens', 'consumables', 12.99, 25, 30, 200, 'bbbb1111-cccc-2222-dddd-333344445555', 'Office-Storage'),
('inv77777-7777-7777-7777-777777777777', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'SOFT-001', 'Microsoft Office 365 Business License', 'Annual business license for Office 365', 'services', 150.00, 10, 5, 50, 'bbbb2222-cccc-3333-dddd-444455556666', 'Digital-Licenses')
ON CONFLICT (id) DO NOTHING;

-- Purchase orders
INSERT INTO purchase_order (id, org_id, supplier_id, po_number, status, total_amount, order_date, expected_delivery_date, created_by) VALUES
-- TechCorp purchase orders
('po111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aaaa1111-bbbb-2222-cccc-333344445555', 'TECHCORP-000001', 'sent', 15599.60, '2024-09-15', '2024-09-29', '22222222-2222-2222-2222-222222222222'),
('po222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aaaa2222-bbbb-3333-cccc-444455556666', 'TECHCORP-000002', 'pending_approval', 8999.55, '2024-09-18', '2024-10-09', '22222222-2222-2222-2222-222222222222'),

-- StartupHub purchase orders
('po333333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'bbbb1111-cccc-2222-dddd-333344445555', 'STARTUPHUB-000001', 'completed', 538.50, '2024-09-10', '2024-09-15', '66666666-6666-6666-6666-666666666666')
ON CONFLICT (id) DO NOTHING;

-- Purchase order items
INSERT INTO purchase_order_item (id, purchase_order_id, inventory_item_id, quantity, unit_price) VALUES
-- TechCorp PO items
('poi11111-1111-1111-1111-111111111111', 'po111111-1111-1111-1111-111111111111', 'inv11111-1111-1111-1111-111111111111', 25, 379.99),
('poi22222-2222-2222-2222-222222222222', 'po111111-1111-1111-1111-111111111111', 'inv22222-2222-2222-2222-222222222222', 35, 149.99),
('poi33333-3333-3333-3333-333333333333', 'po222222-2222-2222-2222-222222222222', 'inv33333-3333-3333-3333-333333333333', 45, 199.99),

-- StartupHub PO items
('poi44444-4444-4444-4444-444444444444', 'po333333-3333-3333-3333-333333333333', 'inv55555-5555-5555-5555-555555555555', 50, 8.49),
('poi55555-5555-5555-5555-555555555555', 'po333333-3333-3333-3333-333333333333', 'inv66666-6666-6666-6666-666666666666', 10, 11.99)
ON CONFLICT (id) DO NOTHING;

-- =======================
-- SEED CUSTOMER OPS DATA
-- =======================

-- Customers
INSERT INTO customer (id, org_id, name, email, phone, company, segment, status, lifetime_value, acquisition_date) VALUES
-- TechCorp customers
('cust1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'John Smith', 'john.smith@megacorp.com', '+1-555-1001', 'MegaCorp Solutions', 'enterprise', 'active', 125000.00, '2023-03-15'),
('cust2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah Davis', 'sarah.davis@innovate.co', '+1-555-1002', 'Innovate Technologies', 'mid_market', 'active', 75000.00, '2023-07-22'),
('cust3333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mike Johnson', 'mike@quickstart.io', '+1-555-1003', 'QuickStart Labs', 'startup', 'prospect', 0.00, '2024-09-01'),

-- StartupHub customers
('cust4444-4444-4444-4444-444444444444', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'Lisa Wong', 'lisa.wong@localfirm.com', '+1-555-2001', 'Local Business Firm', 'smb', 'active', 15000.00, '2024-01-10'),
('cust5555-5555-5555-5555-555555555555', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'Robert Taylor', 'robert@creativeagency.com', '+1-555-2002', 'Creative Design Agency', 'smb', 'active', 22000.00, '2024-04-18')
ON CONFLICT (id) DO NOTHING;

-- Support tickets
INSERT INTO support_ticket (id, org_id, customer_id, assigned_to, ticket_number, title, description, priority, status, category) VALUES
-- TechCorp tickets
('tick1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cust1111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'TECHCORP-000001', 'API Integration Issues', 'Customer experiencing timeout errors when calling our REST API endpoints', 'high', 'in_progress', 'Technical'),
('tick2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cust2222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'TECHCORP-000002', 'Feature Request: Bulk Export', 'Would like ability to export all customer data in bulk', 'medium', 'open', 'Feature Request'),
('tick3333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cust3333-3333-3333-3333-333333333333', NULL, 'TECHCORP-000003', 'Account Setup Assistance', 'New customer needs help with initial account configuration', 'low', 'open', 'Onboarding'),

-- StartupHub tickets
('tick4444-4444-4444-4444-444444444444', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'cust4444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'STARTUPHUB-000001', 'Billing Question', 'Customer has questions about recent invoice charges', 'medium', 'resolved', 'Billing'),
('tick5555-5555-5555-5555-555555555555', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'cust5555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'STARTUPHUB-000002', 'Dashboard Not Loading', 'Customer reports dashboard showing blank page', 'urgent', 'in_progress', 'Technical')
ON CONFLICT (id) DO NOTHING;

-- Ticket comments
INSERT INTO ticket_comment (id, ticket_id, user_id, content, is_internal) VALUES
('comm1111-1111-1111-1111-111111111111', 'tick1111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Initial investigation shows potential issue with rate limiting. Escalating to engineering team.', true),
('comm2222-2222-2222-2222-222222222222', 'tick1111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Hi John, thanks for reporting this issue. Our team is investigating and will have an update within 24 hours.', false),
('comm3333-3333-3333-3333-333333333333', 'tick4444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'Reviewed invoice and explained charges. Customer satisfied with explanation.', false)
ON CONFLICT (id) DO NOTHING;

-- =======================
-- SEED AI WORKSPACE DATA
-- =======================

-- AI conversations
INSERT INTO ai_conversation (id, org_id, user_id, title, model, total_messages, total_tokens_used) VALUES
-- TechCorp AI conversations
('conv1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-3333-3333-3333-333333333333', 'Customer Churn Analysis', 'gpt-4', 12, 8450),
('conv2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-3333-3333-3333-333333333333', 'Supply Chain Optimization Ideas', 'gpt-4', 8, 6200),

-- StartupHub AI conversations
('conv3333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', '55555555-5555-5555-5555-555555555555', 'Marketing Strategy Brainstorm', 'gpt-3.5-turbo', 6, 3800)
ON CONFLICT (id) DO NOTHING;

-- AI datasets
INSERT INTO ai_dataset (id, org_id, name, description, data_type, record_count, is_public, created_by) VALUES
-- TechCorp datasets
('data1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Customer Interaction History', 'Historical customer support interactions for sentiment analysis', 'csv', 15420, true, '33333333-3333-3333-3333-333333333333'),
('data2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Inventory Movement Patterns', 'Monthly inventory movement data for demand forecasting', 'json', 8650, false, '33333333-3333-3333-3333-333333333333'),

-- StartupHub datasets
('data3333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'Website Analytics', 'Website traffic and conversion data', 'csv', 5200, true, '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO NOTHING;

-- AI prompt templates
INSERT INTO ai_prompt_template (id, org_id, name, description, template_text, category, variables, usage_count, is_public, created_by) VALUES
-- TechCorp templates
('tmpl1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Customer Email Response', 'Template for drafting customer support email responses', 'Draft a professional email response to a customer who reported: {issue_description}. Acknowledge the issue, provide expected resolution timeframe of {timeframe}, and include any relevant {additional_info}.', 'generation', '{"issue_description", "timeframe", "additional_info"}', 45, true, '33333333-3333-3333-3333-333333333333'),
('tmpl2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Inventory Analysis', 'Template for analyzing inventory trends', 'Analyze the following inventory data: {inventory_data}. Identify trends, seasonal patterns, and recommend optimal reorder points for each item. Focus on items with high turnover rates.', 'analysis', '{"inventory_data"}', 28, false, '33333333-3333-3333-3333-333333333333'),

-- StartupHub templates
('tmpl3333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'Marketing Copy Generator', 'Template for creating marketing content', 'Create compelling marketing copy for {product_name} targeting {target_audience}. Highlight these key benefits: {benefits}. Use a {tone} tone and include a call-to-action.', 'generation', '{"product_name", "target_audience", "benefits", "tone"}', 15, true, '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO NOTHING;

-- =======================
-- SEED DASHBOARD DATA
-- =======================

-- Dashboards
INSERT INTO dashboard (id, org_id, name, description, layout_config, is_public, created_by) VALUES
-- TechCorp dashboards
('dash1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Executive Overview', 'High-level metrics for executive team', '{"layout": "grid", "columns": 4, "rows": 3}', true, '11111111-1111-1111-1111-111111111111'),
('dash2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Supply Chain Operations', 'Detailed supply chain metrics and alerts', '{"layout": "grid", "columns": 3, "rows": 4}', true, '22222222-2222-2222-2222-222222222222'),
('dash3333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Customer Support Dashboard', 'Support team performance and ticket metrics', '{"layout": "grid", "columns": 2, "rows": 5}', true, '44444444-4444-4444-4444-444444444444'),

-- StartupHub dashboards
('dash4444-4444-4444-4444-444444444444', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'Business Overview', 'Key business metrics for startup monitoring', '{"layout": "grid", "columns": 3, "rows": 3}', true, '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO NOTHING;

-- Widgets
INSERT INTO widget (id, org_id, dashboard_id, name, type, config, position, size) VALUES
-- TechCorp widgets
('widg1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'dash1111-1111-1111-1111-111111111111', 'Total Revenue', 'kpi_card', '{"metric": "total_revenue", "format": "currency"}', '{"x": 0, "y": 0}', '{"width": 1, "height": 1}'),
('widg2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'dash1111-1111-1111-1111-111111111111', 'Active Customers', 'kpi_card', '{"metric": "active_customers", "format": "number"}', '{"x": 1, "y": 0}', '{"width": 1, "height": 1}'),
('widg3333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'dash2222-2222-2222-2222-222222222222', 'Inventory Levels', 'chart_bar', '{"data_source": "inventory_items", "chart_type": "bar"}', '{"x": 0, "y": 0}', '{"width": 2, "height": 2}'),

-- StartupHub widgets
('widg4444-4444-4444-4444-444444444444', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'dash4444-4444-4444-4444-444444444444', 'Monthly Growth', 'chart_line', '{"metric": "monthly_growth", "timeframe": "12m"}', '{"x": 0, "y": 0}', '{"width": 2, "height": 1}')
ON CONFLICT (id) DO NOTHING;

-- Notifications
INSERT INTO notification (id, org_id, user_id, type, title, message, created_at) VALUES
-- TechCorp notifications
('notif1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444', 'warning', 'High Priority Ticket', 'Ticket TECHCORP-000001 has been open for 2 days', now() - interval '2 hours'),
('notif2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '22222222-2222-2222-2222-222222222222', 'info', 'Low Stock Alert', 'PC cases (CASE-001) are running low - only 15 units remaining', now() - interval '6 hours'),

-- StartupHub notifications
('notif3333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', '77777777-7777-7777-7777-777777777777', 'urgent', 'Urgent Ticket', 'Customer dashboard loading issue requires immediate attention', now() - interval '30 minutes'),
('notif4444-4444-4444-4444-444444444444', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', NULL, 'system', 'System Maintenance', 'Scheduled maintenance window tomorrow 2-4 AM', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- System metrics (sample data for last 7 days)
INSERT INTO system_metric (id, org_id, metric_name, metric_type, metric_value, unit, tags, timestamp) VALUES
-- TechCorp metrics
('metric1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'api_response_time', 'gauge', 145.5, 'ms', '{"endpoint": "/api/v1/customers"}', now() - interval '1 hour'),
('metric2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'api_response_time', 'gauge', 156.2, 'ms', '{"endpoint": "/api/v1/customers"}', now() - interval '2 hours'),
('metric3333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'active_users', 'gauge', 1247, 'count', '{}', now() - interval '1 hour'),
('metric4444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ticket_resolution_time', 'gauge', 2.5, 'hours', '{"priority": "high"}', now() - interval '3 hours'),

-- StartupHub metrics
('metric5555-5555-5555-5555-555555555555', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'api_response_time', 'gauge', 98.3, 'ms', '{"endpoint": "/api/v1/dashboard"}', now() - interval '1 hour'),
('metric6666-6666-6666-6666-666666666666', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'active_users', 'gauge', 127, 'count', '{}', now() - interval '1 hour'),
('metric7777-7777-7777-7777-777777777777', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'customer_satisfaction', 'gauge', 4.2, 'rating', '{"scale": "1-5"}', now() - interval '1 day')
ON CONFLICT (id, timestamp) DO NOTHING;

-- =======================
-- SEED INTEGRATION DATA
-- =======================

-- Integration connectors
INSERT INTO integration_connector (id, org_id, name, provider, config, status, sync_frequency_minutes, created_by) VALUES
-- TechCorp integrations
('conn1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Salesforce CRM Sync', 'salesforce', '{"instance_url": "https://techcorp.salesforce.com", "api_version": "v54.0"}', 'active', 60, '11111111-1111-1111-1111-111111111111'),
('conn2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Slack Notifications', 'slack', '{"webhook_url": "https://hooks.slack.com/techcorp", "channel": "#operations"}', 'active', 15, '22222222-2222-2222-2222-222222222222'),

-- StartupHub integrations
('conn3333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'Google Workspace', 'google_workspace', '{"domain": "startuphub.com", "admin_email": "emma@startuphub.com"}', 'active', 120, '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO NOTHING;

-- Alert rules
INSERT INTO alert_rule (id, org_id, name, description, metric_name, condition, severity, created_by) VALUES
-- TechCorp alerts
('alert111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'High API Response Time', 'Alert when API response time exceeds 200ms', 'api_response_time', '{"operator": ">", "threshold": 200}', 'warning', '22222222-2222-2222-2222-222222222222'),
('alert222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Critical Support Backlog', 'Alert when high priority tickets exceed 5', 'high_priority_tickets', '{"operator": ">", "threshold": 5}', 'error', '44444444-4444-4444-4444-444444444444'),

-- StartupHub alerts
('alert333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f21234567890', 'Customer Satisfaction Drop', 'Alert when customer satisfaction falls below 4.0', 'customer_satisfaction', '{"operator": "<", "threshold": 4.0}', 'warning', '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO NOTHING;

-- Update table statistics after seeding
ANALYZE organization;
ANALYZE profile;
ANALYZE supplier;
ANALYZE inventory_item;
ANALYZE purchase_order;
ANALYZE customer;
ANALYZE support_ticket;
ANALYZE ai_conversation;
ANALYZE dashboard;
ANALYZE notification;
ANALYZE system_metric;

INSERT INTO schema_migrations (migration_name)
VALUES ('0010_seed')
ON CONFLICT (migration_name) DO NOTHING;

-- down

-- Clean up seed data in reverse dependency order
DELETE FROM alert_rule;
DELETE FROM integration_connector;
DELETE FROM system_metric;
DELETE FROM notification;
DELETE FROM widget;
DELETE FROM dashboard;
DELETE FROM ai_prompt_template;
DELETE FROM ai_dataset;
DELETE FROM ai_conversation;
DELETE FROM ticket_comment;
DELETE FROM support_ticket;
DELETE FROM customer;
DELETE FROM purchase_order_item;
DELETE FROM purchase_order;
DELETE FROM inventory_item;
DELETE FROM supplier;
DELETE FROM profile;
DELETE FROM organization;
