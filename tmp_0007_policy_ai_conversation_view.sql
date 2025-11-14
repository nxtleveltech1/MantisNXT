DROP POLICY IF EXISTS "ai_conversation_org_view" ON ai_conversation;
CREATE POLICY "ai_conversation_org_view" ON ai_conversation
    FOR SELECT USING (org_id = auth.user_org_id());

