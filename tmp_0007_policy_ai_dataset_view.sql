DROP POLICY IF EXISTS "ai_dataset_public_view" ON ai_dataset;
CREATE POLICY "ai_dataset_public_view" ON ai_dataset
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            is_public = true OR
            created_by = auth.uid() OR
            auth.has_role(ARRAY['admin', 'ai_team'])
        )
    );

