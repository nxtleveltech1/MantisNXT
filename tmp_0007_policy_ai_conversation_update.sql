DROP POLICY IF EXISTS "ai_conversation_own_update" ON ai_conversation;
CREATE POLICY "ai_conversation_own_update" ON ai_conversation
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        (user_id = auth.uid() OR auth.has_role(ARRAY['admin', 'ai_team']))
    );

