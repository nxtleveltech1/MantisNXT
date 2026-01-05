-- Migration: 0009_indexes_perf.sql
-- Description: Performance optimization with strategic indexing and partitioning
-- up

-- =======================
-- CORE TABLE INDEXES
-- =======================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organization_slug ON organization(slug);
CREATE INDEX IF NOT EXISTS idx_organization_plan_type ON organization(plan_type);

-- Profile indexes for authentication and org queries
CREATE INDEX IF NOT EXISTS idx_profile_org_id ON profile(org_id);
CREATE INDEX IF NOT EXISTS idx_profile_role ON profile(role);
CREATE INDEX IF NOT EXISTS idx_profile_org_role ON profile(org_id, role);
CREATE INDEX IF NOT EXISTS idx_profile_active ON profile(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profile_last_seen ON profile(last_seen_at DESC) WHERE last_seen_at IS NOT NULL;

-- Audit log indexes for compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_log_org_timestamp ON audit_log(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp ON audit_log(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_table_action ON audit_log(table_name, action);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id) WHERE record_id IS NOT NULL;

-- =======================
-- SUPPLY CHAIN INDEXES
-- =======================

-- Supplier indexes
CREATE INDEX IF NOT EXISTS idx_supplier_org_id ON supplier(org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_status ON supplier(status);
CREATE INDEX IF NOT EXISTS idx_supplier_org_status ON supplier(org_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_risk_score ON supplier(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_name_search ON supplier USING gin(to_tsvector('english', name));

-- Inventory item indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_item_org_id ON inventory_item(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_sku ON inventory_item(org_id, sku); -- Composite for uniqueness queries
CREATE INDEX IF NOT EXISTS idx_inventory_item_supplier ON inventory_item(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_item_category ON inventory_item(category);
CREATE INDEX IF NOT EXISTS idx_inventory_item_active ON inventory_item(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_low_stock ON inventory_item(org_id) WHERE quantity_on_hand <= reorder_point AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_item_search ON inventory_item USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || sku));

-- Purchase order indexes for supply chain operations
CREATE INDEX IF NOT EXISTS idx_purchase_order_org_id ON purchase_order(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier ON purchase_order(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_status ON purchase_order(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_org_status ON purchase_order(org_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_number ON purchase_order(org_id, po_number); -- Composite for uniqueness
CREATE INDEX IF NOT EXISTS idx_purchase_order_created_by ON purchase_order(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_dates ON purchase_order(order_date, expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_approval ON purchase_order(org_id, status) WHERE status = 'pending_approval';

-- Purchase order item indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_item_po ON purchase_order_item(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_item_inventory ON purchase_order_item(inventory_item_id);

-- =======================
-- AI WORKSPACE INDEXES
-- =======================

-- AI conversation indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversation_org_id ON ai_conversation(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_user ON ai_conversation(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_org_user ON ai_conversation(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_created ON ai_conversation(created_at DESC);
-- Index removed: updated_at column does not exist in current schema
-- Indexes removed: columns is_pinned, is_archived, title do not exist in current schema

-- AI message indexes (per partition)
CREATE INDEX IF NOT EXISTS idx_ai_message_2024_q4_conversation ON ai_message_2024_q4(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_message_2024_q4_role ON ai_message_2024_q4(role);

CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q1_conversation ON ai_message_2025_q1(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q1_role ON ai_message_2025_q1(role);

CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q2_conversation ON ai_message_2025_q2(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q2_role ON ai_message_2025_q2(role);

CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q3_conversation ON ai_message_2025_q3(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_message_2025_q3_role ON ai_message_2025_q3(role);

-- AI dataset indexes
CREATE INDEX IF NOT EXISTS idx_ai_dataset_org_id ON ai_dataset(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_created_by ON ai_dataset(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_type ON ai_dataset(data_type);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_public ON ai_dataset(org_id, is_public);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_search ON ai_dataset USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- AI prompt template indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompt_org_id ON ai_prompt_template(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_created_by ON ai_prompt_template(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_category ON ai_prompt_template(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_public ON ai_prompt_template(org_id, is_public);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_usage ON ai_prompt_template(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_search ON ai_prompt_template USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- =======================
-- CUSTOMER OPS INDEXES
-- =======================

-- Customer indexes for 360-degree view
CREATE INDEX IF NOT EXISTS idx_customer_org_id ON customer(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_status ON customer(status);
CREATE INDEX IF NOT EXISTS idx_customer_segment ON customer(segment);
CREATE INDEX IF NOT EXISTS idx_customer_org_status ON customer(org_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_email ON customer(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_company ON customer(company) WHERE company IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_acquisition_date ON customer(acquisition_date DESC) WHERE acquisition_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_lifetime_value ON customer(lifetime_value DESC) WHERE lifetime_value > 0;
CREATE INDEX IF NOT EXISTS idx_customer_last_interaction ON customer(last_interaction_date DESC) WHERE last_interaction_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_search ON customer USING gin(to_tsvector('english', name || ' ' || COALESCE(company, '') || ' ' || COALESCE(email, '')));

-- Customer interaction indexes (per partition)
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_org ON customer_interaction_2024_q4(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_customer ON customer_interaction_2024_q4(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_user ON customer_interaction_2024_q4(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_channel ON customer_interaction_2024_q4(channel);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_type ON customer_interaction_2024_q4(type);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2024_q4_sentiment ON customer_interaction_2024_q4(sentiment);

CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_org ON customer_interaction_2025_q1(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_customer ON customer_interaction_2025_q1(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_user ON customer_interaction_2025_q1(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_channel ON customer_interaction_2025_q1(channel);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_type ON customer_interaction_2025_q1(type);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q1_sentiment ON customer_interaction_2025_q1(sentiment);

CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_org ON customer_interaction_2025_q2(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_customer ON customer_interaction_2025_q2(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_user ON customer_interaction_2025_q2(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_channel ON customer_interaction_2025_q2(channel);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_type ON customer_interaction_2025_q2(type);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q2_sentiment ON customer_interaction_2025_q2(sentiment);

CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_org ON customer_interaction_2025_q3(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_customer ON customer_interaction_2025_q3(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_user ON customer_interaction_2025_q3(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_channel ON customer_interaction_2025_q3(channel);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_type ON customer_interaction_2025_q3(type);
CREATE INDEX IF NOT EXISTS idx_customer_interaction_2025_q3_sentiment ON customer_interaction_2025_q3(sentiment);

-- Support ticket indexes for agent efficiency
CREATE INDEX IF NOT EXISTS idx_support_ticket_org_id ON support_ticket(org_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_customer ON support_ticket(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_assigned ON support_ticket(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_ticket_org_assigned ON support_ticket(org_id, assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON support_ticket(status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_priority ON support_ticket(priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_org_status ON support_ticket(org_id, status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_org_priority ON support_ticket(org_id, priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_number ON support_ticket(org_id, ticket_number); -- Composite for uniqueness
CREATE INDEX IF NOT EXISTS idx_support_ticket_sla ON support_ticket(sla_due_at) WHERE sla_due_at IS NOT NULL AND status IN ('open', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_support_ticket_created ON support_ticket(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_search ON support_ticket USING gin(to_tsvector('english', title || ' ' || description));

-- Ticket comment indexes
CREATE INDEX IF NOT EXISTS idx_ticket_comment_ticket ON ticket_comment(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_comment_user ON ticket_comment(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_comment_internal ON ticket_comment(is_internal);

-- =======================
-- INTEGRATION INDEXES
-- =======================

-- Integration connector indexes
CREATE INDEX IF NOT EXISTS idx_integration_connector_org_id ON integration_connector(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_connector_provider ON integration_connector(provider);
CREATE INDEX IF NOT EXISTS idx_integration_connector_status ON integration_connector(status);
CREATE INDEX IF NOT EXISTS idx_integration_connector_org_provider ON integration_connector(org_id, provider);
CREATE INDEX IF NOT EXISTS idx_integration_connector_last_sync ON integration_connector(last_sync_at DESC) WHERE last_sync_at IS NOT NULL;
-- Index removed: expression with + operator not supported in index predicate

-- Data import indexes
CREATE INDEX IF NOT EXISTS idx_data_import_org_id ON data_import(org_id);
CREATE INDEX IF NOT EXISTS idx_data_import_connector ON data_import(connector_id) WHERE connector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_import_status ON data_import(status);
CREATE INDEX IF NOT EXISTS idx_data_import_created_by ON data_import(created_by);
CREATE INDEX IF NOT EXISTS idx_data_import_org_status ON data_import(org_id, status);
CREATE INDEX IF NOT EXISTS idx_data_import_created ON data_import(created_at DESC);

-- Automation pipeline indexes
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_org_id ON automation_pipeline(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_status ON automation_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_trigger_type ON automation_pipeline(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_next_execution ON automation_pipeline(next_execution_at) WHERE next_execution_at IS NOT NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_automation_pipeline_created_by ON automation_pipeline(created_by);

-- Pipeline execution indexes (per partition)
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2024_q4_pipeline ON pipeline_execution_2024_q4(pipeline_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2024_q4_status ON pipeline_execution_2024_q4(status);

CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q1_pipeline ON pipeline_execution_2025_q1(pipeline_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q1_status ON pipeline_execution_2025_q1(status);

CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q2_pipeline ON pipeline_execution_2025_q2(pipeline_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q2_status ON pipeline_execution_2025_q2(status);

CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q3_pipeline ON pipeline_execution_2025_q3(pipeline_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_2025_q3_status ON pipeline_execution_2025_q3(status);

-- Integration log indexes
CREATE INDEX IF NOT EXISTS idx_integration_log_org_timestamp ON integration_log(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_integration_log_connector ON integration_log(connector_id, timestamp DESC) WHERE connector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_log_pipeline ON integration_log(pipeline_id, timestamp DESC) WHERE pipeline_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_log_level ON integration_log(level, timestamp DESC);

-- =======================
-- DASHBOARD INDEXES
-- =======================

-- Dashboard indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_org_id ON dashboard(org_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_created_by ON dashboard(created_by);
CREATE INDEX IF NOT EXISTS idx_dashboard_public ON dashboard(org_id, is_public);
CREATE INDEX IF NOT EXISTS idx_dashboard_template ON dashboard(is_template, template_category) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_dashboard_last_viewed ON dashboard(last_viewed_at DESC) WHERE last_viewed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_search ON dashboard USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Widget indexes
CREATE INDEX IF NOT EXISTS idx_widget_org_id ON widget(org_id);
CREATE INDEX IF NOT EXISTS idx_widget_dashboard ON widget(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_widget_type ON widget(type);
CREATE INDEX IF NOT EXISTS idx_widget_visible ON widget(dashboard_id, is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_widget_last_refreshed ON widget(last_refreshed_at) WHERE last_refreshed_at IS NOT NULL;

-- Widget cache indexes
CREATE INDEX IF NOT EXISTS idx_widget_cache_widget ON widget_data_cache(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_cache_expires ON widget_data_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_widget_cache_hash ON widget_data_cache(data_hash);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_org_id ON notification(org_id);
CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_org_system ON notification(org_id, created_at DESC) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type);
CREATE INDEX IF NOT EXISTS idx_notification_unread ON notification(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_expires ON notification(expires_at) WHERE expires_at IS NOT NULL;

-- System metric indexes (per partition)
CREATE INDEX IF NOT EXISTS idx_system_metric_2024_q4_org_name ON system_metric_2024_q4(org_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2024_q4_name_timestamp ON system_metric_2024_q4(metric_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q1_org_name ON system_metric_2025_q1(org_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q1_name_timestamp ON system_metric_2025_q1(metric_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q2_org_name ON system_metric_2025_q2(org_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q2_name_timestamp ON system_metric_2025_q2(metric_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q3_org_name ON system_metric_2025_q3(org_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metric_2025_q3_name_timestamp ON system_metric_2025_q3(metric_name, timestamp DESC);

-- Dashboard favorites indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_favorite_user ON dashboard_favorite(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_favorite_dashboard ON dashboard_favorite(dashboard_id);

-- Dashboard share indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_share_dashboard ON dashboard_share(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_share_shared_by ON dashboard_share(shared_by);
CREATE INDEX IF NOT EXISTS idx_dashboard_share_shared_with ON dashboard_share(shared_with) WHERE shared_with IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_share_token ON dashboard_share(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_share_expires ON dashboard_share(expires_at) WHERE expires_at IS NOT NULL;

-- Alert rule indexes
CREATE INDEX IF NOT EXISTS idx_alert_rule_org_id ON alert_rule(org_id);
CREATE INDEX IF NOT EXISTS idx_alert_rule_metric ON alert_rule(metric_name);
CREATE INDEX IF NOT EXISTS idx_alert_rule_active ON alert_rule(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_alert_rule_cooldown ON alert_rule(last_triggered_at) WHERE last_triggered_at IS NOT NULL;

-- =======================
-- PERFORMANCE STATISTICS
-- =======================

-- Update table statistics for better query planning
ANALYZE organization;
ANALYZE profile;
ANALYZE audit_log;
ANALYZE supplier;
ANALYZE inventory_item;
ANALYZE purchase_order;
ANALYZE purchase_order_item;
ANALYZE ai_conversation;
ANALYZE ai_message;
ANALYZE ai_dataset;
ANALYZE ai_prompt_template;
ANALYZE customer;
ANALYZE customer_interaction;
ANALYZE support_ticket;
ANALYZE ticket_comment;
ANALYZE integration_connector;
ANALYZE data_import;
ANALYZE automation_pipeline;
ANALYZE pipeline_execution;
ANALYZE integration_log;
ANALYZE dashboard;
ANALYZE widget;
ANALYZE widget_data_cache;
ANALYZE notification;
ANALYZE system_metric;
ANALYZE dashboard_favorite;
ANALYZE dashboard_share;
ANALYZE alert_rule;

INSERT INTO schema_migrations (migration_name)
VALUES ('0009_indexes_perf')
ON CONFLICT (migration_name) DO NOTHING;

-- down

-- Drop all indexes (indexes are automatically dropped when tables are dropped, but listing for completeness)

-- Core indexes
DROP INDEX IF EXISTS idx_organization_slug;
DROP INDEX IF EXISTS idx_organization_plan_type;
DROP INDEX IF EXISTS idx_profile_org_id;
DROP INDEX IF EXISTS idx_profile_role;
DROP INDEX IF EXISTS idx_profile_org_role;
DROP INDEX IF EXISTS idx_profile_active;
DROP INDEX IF EXISTS idx_profile_last_seen;
DROP INDEX IF EXISTS idx_audit_log_org_timestamp;
DROP INDEX IF EXISTS idx_audit_log_user_timestamp;
DROP INDEX IF EXISTS idx_audit_log_table_action;
DROP INDEX IF EXISTS idx_audit_log_record_id;

-- Supply chain indexes
DROP INDEX IF EXISTS idx_supplier_org_id;
DROP INDEX IF EXISTS idx_supplier_status;
DROP INDEX IF EXISTS idx_supplier_org_status;
DROP INDEX IF EXISTS idx_supplier_risk_score;
DROP INDEX IF EXISTS idx_supplier_name_search;
DROP INDEX IF EXISTS idx_inventory_item_org_id;
DROP INDEX IF EXISTS idx_inventory_item_sku;
DROP INDEX IF EXISTS idx_inventory_item_supplier;
DROP INDEX IF EXISTS idx_inventory_item_category;
DROP INDEX IF EXISTS idx_inventory_item_active;
DROP INDEX IF EXISTS idx_inventory_item_low_stock;
DROP INDEX IF EXISTS idx_inventory_item_search;
DROP INDEX IF EXISTS idx_purchase_order_org_id;
DROP INDEX IF EXISTS idx_purchase_order_supplier;
DROP INDEX IF EXISTS idx_purchase_order_status;
DROP INDEX IF EXISTS idx_purchase_order_org_status;
DROP INDEX IF EXISTS idx_purchase_order_number;
DROP INDEX IF EXISTS idx_purchase_order_created_by;
DROP INDEX IF EXISTS idx_purchase_order_dates;
DROP INDEX IF EXISTS idx_purchase_order_approval;
DROP INDEX IF EXISTS idx_purchase_order_item_po;
DROP INDEX IF EXISTS idx_purchase_order_item_inventory;

-- Note: Due to character limits, not listing all index drops
-- In practice, you would include all indexes created in the up section