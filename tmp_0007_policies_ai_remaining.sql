-- Dataset insert/update policies
DROP POLICY IF EXISTS "ai_dataset_own_modify" ON ai_dataset;
CREATE POLICY "ai_dataset_own_modify" ON ai_dataset
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "ai_dataset_creator_update" ON ai_dataset;
CREATE POLICY "ai_dataset_creator_update" ON ai_dataset
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        (created_by = auth.uid() OR auth.has_role(ARRAY['admin', 'manager']))
    );

-- Prompt template policies
DROP POLICY IF EXISTS "ai_prompt_public_view" ON ai_prompt_template;
CREATE POLICY "ai_prompt_public_view" ON ai_prompt_template
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            is_public = true OR
            created_by = auth.uid() OR
            auth.has_role(ARRAY['admin', 'manager'])
        )
    );

DROP POLICY IF EXISTS "ai_prompt_own_modify" ON ai_prompt_template;
CREATE POLICY "ai_prompt_own_modify" ON ai_prompt_template
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "ai_prompt_creator_update" ON ai_prompt_template;
CREATE POLICY "ai_prompt_creator_update" ON ai_prompt_template
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        (created_by = auth.uid() OR auth.has_role(ARRAY['admin', 'manager']))
    );

