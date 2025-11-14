-- Integration policies
DROP POLICY IF EXISTS "integration_connector_privileged" ON integration_connector;
CREATE POLICY "integration_connector_privileged" ON integration_connector
    FOR ALL USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

DROP POLICY IF EXISTS "data_import_view" ON data_import;
CREATE POLICY "data_import_view" ON data_import
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

DROP POLICY IF EXISTS "data_import_modify" ON data_import;
CREATE POLICY "data_import_modify" ON data_import
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

DROP POLICY IF EXISTS "automation_pipeline_view" ON automation_pipeline;
CREATE POLICY "automation_pipeline_view" ON automation_pipeline
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

DROP POLICY IF EXISTS "automation_pipeline_modify" ON automation_pipeline;
CREATE POLICY "automation_pipeline_modify" ON automation_pipeline
    FOR ALL USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

DROP POLICY IF EXISTS "pipeline_execution_access" ON pipeline_execution;
CREATE POLICY "pipeline_execution_access" ON pipeline_execution
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM automation_pipeline ap
            WHERE ap.id = pipeline_id
            AND ap.org_id = auth.user_org_id()
            AND auth.has_role(ARRAY['admin', 'manager'])
        )
    );

DROP POLICY IF EXISTS "integration_log_read" ON integration_log;
CREATE POLICY "integration_log_read" ON integration_log
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

-- Dashboard policies
DROP POLICY IF EXISTS "dashboard_access" ON dashboard;
CREATE POLICY "dashboard_access" ON dashboard
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            is_public = true OR
            created_by = auth.uid() OR
            auth.has_role(ARRAY['admin', 'manager'])
        )
    );

DROP POLICY IF EXISTS "dashboard_create" ON dashboard;
CREATE POLICY "dashboard_create" ON dashboard
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "dashboard_update_creator" ON dashboard;
CREATE POLICY "dashboard_update_creator" ON dashboard
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND (
            created_by = auth.uid() OR
            auth.has_role(ARRAY['admin'])
        )
    );

DROP POLICY IF EXISTS "widget_dashboard_access" ON widget;
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
                auth.has_role(ARRAY['admin', 'manager'])
            )
        )
    );

DROP POLICY IF EXISTS "widget_cache_access" ON widget_data_cache;
CREATE POLICY "widget_cache_access" ON widget_data_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM widget w
            JOIN dashboard d ON d.id = w.dashboard_id
            WHERE w.id = widget_id
            AND d.org_id = auth.user_org_id()
        )
    );

DROP POLICY IF EXISTS "notification_own" ON notification;
CREATE POLICY "notification_own" ON notification
    FOR SELECT USING (
        org_id = auth.user_org_id() AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "notification_system" ON notification;
CREATE POLICY "notification_system" ON notification
    FOR SELECT USING (
        org_id = auth.user_org_id() AND user_id IS NULL
    );

DROP POLICY IF EXISTS "notification_mark_read" ON notification;
CREATE POLICY "notification_mark_read" ON notification
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "system_metric_read" ON system_metric;
CREATE POLICY "system_metric_read" ON system_metric
    FOR SELECT USING (org_id = auth.user_org_id());

DROP POLICY IF EXISTS "system_metric_write" ON system_metric;
CREATE POLICY "system_metric_write" ON system_metric
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

DROP POLICY IF EXISTS "dashboard_favorite_own" ON dashboard_favorite;
CREATE POLICY "dashboard_favorite_own" ON dashboard_favorite
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "dashboard_share_own" ON dashboard_share;
CREATE POLICY "dashboard_share_own" ON dashboard_share
    FOR ALL USING (
        shared_by = auth.uid() OR shared_with = auth.uid() OR
        auth.has_role(ARRAY['admin', 'manager'])
    );

DROP POLICY IF EXISTS "alert_rule_privileged" ON alert_rule;
CREATE POLICY "alert_rule_privileged" ON alert_rule
    FOR ALL USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager'])
    );

