DROP POLICY IF EXISTS "ai_message_conversation_access" ON ai_message;
CREATE POLICY "ai_message_conversation_access" ON ai_message
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ai_conversation ac
            WHERE ac.id = conversation_id::uuid
            AND ac.org_id = auth.user_org_id()
        )
    );

