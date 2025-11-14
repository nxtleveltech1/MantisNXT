DROP POLICY IF EXISTS "ai_conversation_own_modify" ON ai_conversation;
CREATE POLICY "ai_conversation_own_modify" ON ai_conversation
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND user_id = auth.uid()
    );

