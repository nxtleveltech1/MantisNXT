-- Migration: 0007_rls_policies.sql
-- Description: Row Level Security (RLS) policies for multi-tenant data isolation and role-based access
-- up

-- Enable RLS on all tenant-scoped tables
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Supply Chain tables
ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_item ENABLE ROW LEVEL SECURITY;

-- AI Workspace tables
ALTER TABLE ai_conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_dataset ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_template ENABLE ROW LEVEL SECURITY;

-- Customer Operations tables
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comment ENABLE ROW LEVEL SECURITY;

-- Integration tables
ALTER TABLE integration_connector ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_execution ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_log ENABLE ROW LEVEL SECURITY;

-- Dashboard tables
ALTER TABLE dashboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metric ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_favorite ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_share ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rule ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization ID
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT org_id FROM profile WHERE id = auth.uid();
$$;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM profile WHERE id = auth.uid();
$$;

-- Helper function to check if user has admin role
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profile
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Helper function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION auth.has_role(allowed_roles user_role[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profile
        WHERE id = auth.uid() AND role = ANY(allowed_roles)
    );
$$;

-- =======================
-- ORGANIZATION POLICIES
-- =======================

-- Users can only see their own organization
CREATE POLICY "organization_isolation" ON organization
    FOR ALL USING (
        id = auth.user_org_id()
    );

-- Only admins can update organization settings
CREATE POLICY "organization_update_admin_only" ON organization
    FOR UPDATE USING (
        id = auth.user_org_id() AND auth.is_admin()
    );

-- =======================
-- PROFILE POLICIES
-- =======================

-- Users can see all profiles in their organization
CREATE POLICY "profile_org_isolation" ON profile
    FOR SELECT USING (
        org_id = auth.user_org_id()
    );

-- Users can update their own profile
CREATE POLICY "profile_update_own" ON profile
    FOR UPDATE USING (
        id = auth.uid()
    );

-- Admins can update any profile in their org
CREATE POLICY "profile_update_admin" ON profile
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND auth.is_admin()
    );

-- Admins can insert new profiles in their org
CREATE POLICY "profile_insert_admin" ON profile
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND auth.is_admin()
    );

-- =======================
-- AUDIT LOG POLICIES
-- =======================

-- Only admins and ops_managers can view audit logs
CREATE POLICY "audit_log_view_privileged" ON audit_log
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

-- =======================
-- SUPPLY CHAIN POLICIES
-- =======================

-- All supply chain data is org-scoped
CREATE POLICY "supplier_org_isolation" ON supplier
    FOR ALL USING (org_id = auth.user_org_id());

CREATE POLICY "inventory_item_org_isolation" ON inventory_item
    FOR ALL USING (org_id = auth.user_org_id());

CREATE POLICY "purchase_order_org_isolation" ON purchase_order
    FOR ALL USING (org_id = auth.user_org_id());

-- Purchase order items inherit access from their parent PO
CREATE POLICY "purchase_order_item_access" ON purchase_order_item
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM purchase_order po
            WHERE po.id = purchase_order_id
            AND po.org_id = auth.user_org_id()
        )
    );

-- Only ops_managers and admins can modify suppliers
CREATE POLICY "supplier_modify_ops_admin" ON supplier
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

CREATE POLICY "supplier_update_ops_admin" ON supplier
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

-- Only ops_managers and admins can delete suppliers
CREATE POLICY "supplier_delete_ops_admin" ON supplier
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

-- =======================
-- AI WORKSPACE POLICIES
-- =======================

-- Users can see all org conversations, but can only modify their own
CREATE POLICY "ai_conversation_org_view" ON ai_conversation
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY "ai_conversation_own_modify" ON ai_conversation
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND user_id = auth.uid()
    );

CREATE POLICY "ai_conversation_own_update" ON ai_conversation
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        (user_id = auth.uid() OR auth.has_role(ARRAY['admin', 'ai_team']))
    );

-- AI messages inherit access from their conversation
CREATE POLICY "ai_message_conversation_access" ON ai_message
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ai_conversation ac
            WHERE ac.id = conversation_id
            AND ac.org_id = auth.user_org_id()
        )
    );

-- AI datasets: public ones visible to all in org, private ones only to creator and ai_team
CREATE POLICY "ai_dataset_public_view" ON ai_dataset
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            is_public = true OR
            created_by = auth.uid() OR
            auth.has_role(ARRAY['admin', 'ai_team'])
        )
    );

CREATE POLICY "ai_dataset_own_modify" ON ai_dataset
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND created_by = auth.uid()
    );

CREATE POLICY "ai_dataset_creator_update" ON ai_dataset
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        (created_by = auth.uid() OR auth.has_role(ARRAY['admin', 'ai_team']))
    );

-- AI prompt templates: similar to datasets
CREATE POLICY "ai_prompt_public_view" ON ai_prompt_template
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            is_public = true OR
            created_by = auth.uid() OR
            auth.has_role(ARRAY['admin', 'ai_team'])
        )
    );

CREATE POLICY "ai_prompt_own_modify" ON ai_prompt_template
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND created_by = auth.uid()
    );

CREATE POLICY "ai_prompt_creator_update" ON ai_prompt_template
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        (created_by = auth.uid() OR auth.has_role(ARRAY['admin', 'ai_team']))
    );

-- =======================
-- CUSTOMER OPS POLICIES
-- =======================

-- Customer data is org-scoped, but cs_agents can only see assigned customers
CREATE POLICY "customer_org_isolation" ON customer
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            auth.has_role(ARRAY['admin', 'ops_manager', 'exec']) OR
            (auth.user_role() = 'cs_agent' AND EXISTS (
                SELECT 1 FROM support_ticket st
                WHERE st.customer_id = id AND st.assigned_to = auth.uid()
            ))
        )
    );

-- All roles can create customers
CREATE POLICY "customer_create_all" ON customer
    FOR INSERT WITH CHECK (org_id = auth.user_org_id());

-- Only privileged roles can update customers
CREATE POLICY "customer_update_privileged" ON customer
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'cs_agent'])
    );

-- Customer interactions: agents can see interactions for their assigned customers
CREATE POLICY "customer_interaction_access" ON customer_interaction
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            auth.has_role(ARRAY['admin', 'ops_manager', 'exec']) OR
            user_id = auth.uid() OR
            (auth.user_role() = 'cs_agent' AND EXISTS (
                SELECT 1 FROM support_ticket st
                WHERE st.customer_id = customer_interaction.customer_id
                AND st.assigned_to = auth.uid()
            ))
        )
    );

CREATE POLICY "customer_interaction_create" ON customer_interaction
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'cs_agent'])
    );

-- Support tickets: agents can see all tickets but only modify assigned ones
CREATE POLICY "support_ticket_view" ON support_ticket
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'cs_agent'])
    );

CREATE POLICY "support_ticket_create" ON support_ticket
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'cs_agent'])
    );

CREATE POLICY "support_ticket_update_assigned" ON support_ticket
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND (
            assigned_to = auth.uid() OR
            auth.has_role(ARRAY['admin', 'ops_manager'])
        )
    );

-- Ticket comments inherit access from their ticket
CREATE POLICY "ticket_comment_access" ON ticket_comment
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM support_ticket st
            WHERE st.id = ticket_id
            AND st.org_id = auth.user_org_id()
            AND (
                st.assigned_to = auth.uid() OR
                auth.has_role(ARRAY['admin', 'ops_manager', 'cs_agent'])
            )
        )
    );

-- =======================
-- INTEGRATION POLICIES
-- =======================

-- Only admins and integrations role can manage connectors
CREATE POLICY "integration_connector_privileged" ON integration_connector
    FOR ALL USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'integrations'])
    );

-- Data imports: view access for ops roles, modify for integrations
CREATE POLICY "data_import_view" ON data_import
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'integrations'])
    );

CREATE POLICY "data_import_modify" ON data_import
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'integrations'])
    );

-- Automation pipelines: similar to data imports
CREATE POLICY "automation_pipeline_view" ON automation_pipeline
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'integrations'])
    );

CREATE POLICY "automation_pipeline_modify" ON automation_pipeline
    FOR ALL USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'integrations'])
    );

-- Pipeline executions inherit from their pipeline
CREATE POLICY "pipeline_execution_access" ON pipeline_execution
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM automation_pipeline ap
            WHERE ap.id = pipeline_id
            AND ap.org_id = auth.user_org_id()
            AND auth.has_role(ARRAY['admin', 'ops_manager', 'integrations'])
        )
    );

-- Integration logs: read-only for troubleshooting
CREATE POLICY "integration_log_read" ON integration_log
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'integrations'])
    );

-- =======================
-- DASHBOARD POLICIES
-- =======================

-- Dashboards: public ones visible to all in org, private ones to creator and privileged roles
CREATE POLICY "dashboard_access" ON dashboard
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            is_public = true OR
            created_by = auth.uid() OR
            auth.has_role(ARRAY['admin', 'ops_manager', 'exec'])
        )
    );

CREATE POLICY "dashboard_create" ON dashboard
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND created_by = auth.uid()
    );

CREATE POLICY "dashboard_update_creator" ON dashboard
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND (
            created_by = auth.uid() OR
            auth.has_role(ARRAY['admin'])
        )
    );

-- Widgets inherit access from their dashboard
CREATE POLICY "widget_dashboard_access" ON widget
    FOR ALL USING (
        org_id = auth.user_org_id() AND
        EXISTS (
            SELECT 1 FROM dashboard d
            WHERE d.id = dashboard_id
            AND d.org_id = auth.user_org_id()
            AND (
                d.is_public = true OR
                d.created_by = auth.uid() OR
                auth.has_role(ARRAY['admin', 'ops_manager', 'exec'])
            )
        )
    );

-- Widget cache inherits from widget
CREATE POLICY "widget_cache_access" ON widget_data_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM widget w
            JOIN dashboard d ON d.id = w.dashboard_id
            WHERE w.id = widget_id
            AND d.org_id = auth.user_org_id()
        )
    );

-- Notifications: users see their own notifications
CREATE POLICY "notification_own" ON notification
    FOR SELECT USING (
        org_id = auth.user_org_id() AND user_id = auth.uid()
    );

-- System notifications (user_id = NULL) visible to all in org
CREATE POLICY "notification_system" ON notification
    FOR SELECT USING (
        org_id = auth.user_org_id() AND user_id IS NULL
    );

-- Users can mark their notifications as read
CREATE POLICY "notification_mark_read" ON notification
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND user_id = auth.uid()
    );

-- System metrics: all authenticated users in org can read
CREATE POLICY "system_metric_read" ON system_metric
    FOR SELECT USING (org_id = auth.user_org_id());

-- Only system/integrations can write metrics
CREATE POLICY "system_metric_write" ON system_metric
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'integrations'])
    );

-- Dashboard favorites: users manage their own
CREATE POLICY "dashboard_favorite_own" ON dashboard_favorite
    FOR ALL USING (user_id = auth.uid());

-- Dashboard sharing: users can share their own dashboards
CREATE POLICY "dashboard_share_own" ON dashboard_share
    FOR ALL USING (
        shared_by = auth.uid() OR shared_with = auth.uid() OR
        auth.has_role(ARRAY['admin'])
    );

-- Alert rules: privileged roles only
CREATE POLICY "alert_rule_privileged" ON alert_rule
    FOR ALL USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

-- down

-- Drop all policies (RLS policies are automatically dropped when RLS is disabled)
ALTER TABLE organization DISABLE ROW LEVEL SECURITY;
ALTER TABLE profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_message DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_dataset DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_template DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interaction DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comment DISABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connector DISABLE ROW LEVEL SECURITY;
ALTER TABLE data_import DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_pipeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_execution DISABLE ROW LEVEL SECURITY;
ALTER TABLE integration_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard DISABLE ROW LEVEL SECURITY;
ALTER TABLE widget DISABLE ROW LEVEL SECURITY;
ALTER TABLE widget_data_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_metric DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_favorite DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_share DISABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rule DISABLE ROW LEVEL SECURITY;

-- Drop helper functions
DROP FUNCTION IF EXISTS auth.has_role(user_role[]);
DROP FUNCTION IF EXISTS auth.is_admin();
DROP FUNCTION IF EXISTS auth.user_role();
DROP FUNCTION IF EXISTS auth.user_org_id();