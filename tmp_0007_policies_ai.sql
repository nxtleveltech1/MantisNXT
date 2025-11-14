-- AI conversation policies
DROP POLICY IF EXISTS "ai_conversation_org_view" ON ai_conversation;
CREATE POLICY "ai_conversation_org_view" ON ai_conversation
    FOR SELECT USING (org_id = auth.user_org_id());

DROP POLICY IF EXISTS "ai_conversation_own_modify" ON ai_conversation;
CREATE POLICY "ai_conversation_own_modify" ON ai_conversation
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "ai_conversation_own_update" ON ai_conversation;
CREATE POLICY "ai_conversation_own_update" ON ai_conversation
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        (user_id = auth.uid() OR auth.has_role(ARRAY['admin', 'manager']))
    );

-- AI message policies
DROP POLICY IF EXISTS "ai_message_conversation_access" ON ai_message;
CREATE POLICY "ai_message_conversation_access" ON ai_message
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ai_conversation ac
            WHERE ac.id = conversation_id::uuid
            AND ac.org_id = auth.user_org_id()
        )
    );

-- AI dataset policies
DROP POLICY IF EXISTS "ai_dataset_public_view" ON ai_dataset;
CREATE POLICY "ai_dataset_public_view" ON ai_dataset
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            is_public = true OR
            created_by = auth.uid() OR
            auth.has_role(ARRAY['admin', 'manager'])
        )
    );

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

-- AI prompt template policies
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

