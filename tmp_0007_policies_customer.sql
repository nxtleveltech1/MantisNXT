-- Customer policies
DROP POLICY IF EXISTS "customer_org_isolation" ON customer;
CREATE POLICY "customer_org_isolation" ON customer
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            auth.has_role(ARRAY['admin', 'manager']) OR
            (auth.user_role() = 'user' AND EXISTS (
                SELECT 1 FROM support_ticket st
                WHERE st.customer_id = id AND st.assigned_to = auth.uid()
            ))
        )
    );

DROP POLICY IF EXISTS "customer_create_all" ON customer;
CREATE POLICY "customer_create_all" ON customer
    FOR INSERT WITH CHECK (org_id = auth.user_org_id());

DROP POLICY IF EXISTS "customer_update_privileged" ON customer;
CREATE POLICY "customer_update_privileged" ON customer
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager', 'user'])
    );

-- Customer interaction policies
DROP POLICY IF EXISTS "customer_interaction_access" ON customer_interaction;
CREATE POLICY "customer_interaction_access" ON customer_interaction
    FOR SELECT USING (
        org_id = auth.user_org_id() AND (
            auth.has_role(ARRAY['admin', 'manager']) OR
            user_id = auth.uid() OR
            (auth.user_role() = 'user' AND EXISTS (
                SELECT 1 FROM support_ticket st
                WHERE st.customer_id = customer_interaction.customer_id
                AND st.assigned_to = auth.uid()
            ))
        )
    );

DROP POLICY IF EXISTS "customer_interaction_create" ON customer_interaction;
CREATE POLICY "customer_interaction_create" ON customer_interaction
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager', 'user'])
    );

-- Support ticket policies
DROP POLICY IF EXISTS "support_ticket_view" ON support_ticket;
CREATE POLICY "support_ticket_view" ON support_ticket
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager', 'user'])
    );

DROP POLICY IF EXISTS "support_ticket_create" ON support_ticket;
CREATE POLICY "support_ticket_create" ON support_ticket
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'manager', 'user'])
    );

DROP POLICY IF EXISTS "support_ticket_update_assigned" ON support_ticket;
CREATE POLICY "support_ticket_update_assigned" ON support_ticket
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND (
            assigned_to = auth.uid() OR
            auth.has_role(ARRAY['admin', 'manager'])
        )
    );

-- Ticket comment policy
DROP POLICY IF EXISTS "ticket_comment_access" ON ticket_comment;
CREATE POLICY "ticket_comment_access" ON ticket_comment
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM support_ticket st
            WHERE st.id = ticket_id
            AND st.org_id = auth.user_org_id()
            AND (
                st.assigned_to = auth.uid() OR
                auth.has_role(ARRAY['admin', 'manager', 'user'])
            )
        )
    );

