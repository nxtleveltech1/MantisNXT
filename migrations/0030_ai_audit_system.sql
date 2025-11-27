-- =====================================================
-- AI AUDIT SYSTEM
-- =====================================================
-- Migration: 0030_ai_audit_system.sql
-- Description: Creates audit tables for AI decision logging and explainability
-- Date: 2025-11-26

-- Create ai_audit_events table
CREATE TABLE IF NOT EXISTS ai_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('tool_execution', 'decision', 'access_check', 'approval', 'error', 'conversation')),
    severity TEXT NOT NULL CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    org_id UUID,
    user_id UUID,
    session_id UUID,
    tool_name TEXT,
    parameters JSONB,
    result JSONB,
    reasoning TEXT,
    alternatives TEXT[],
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_audit_events_org_id ON ai_audit_events(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_events_user_id ON ai_audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_events_session_id ON ai_audit_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_events_event_type ON ai_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_audit_events_timestamp ON ai_audit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_audit_events_tool_name ON ai_audit_events(tool_name) WHERE tool_name IS NOT NULL;

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_audit_events_org_session ON ai_audit_events(org_id, session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_audit_events_user_timestamp ON ai_audit_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_events_type_severity ON ai_audit_events(event_type, severity, timestamp DESC);

-- Create ai_decision_trail table for linked decisions (optional enhancement)
CREATE TABLE IF NOT EXISTS ai_decision_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    decision_chain TEXT[] NOT NULL, -- Array of decision IDs in order
    confidence_scores NUMERIC(3,2)[] NOT NULL, -- Corresponding confidence scores
    final_outcome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for decision trail queries
CREATE INDEX IF NOT EXISTS idx_ai_decision_trail_session ON ai_decision_trail(session_id);

-- Add RLS policies for multi-tenant security
ALTER TABLE ai_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_trail ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see audit events from their organization
CREATE POLICY ai_audit_events_org_policy ON ai_audit_events
    FOR ALL USING (org_id::text = current_setting('app.current_org_id', true));

-- Policy: Users can only see decision trails from their organization
CREATE POLICY ai_decision_trail_org_policy ON ai_decision_trail
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ai_audit_events
            WHERE ai_audit_events.session_id = ai_decision_trail.session_id
            AND ai_audit_events.org_id::text = current_setting('app.current_org_id', true)
        )
    );

-- Add comments for documentation
COMMENT ON TABLE ai_audit_events IS 'Comprehensive audit log for all AI system activities including tool executions, decisions, and access controls';
COMMENT ON TABLE ai_decision_trail IS 'Tracks chains of related AI decisions within sessions for explainability';

COMMENT ON COLUMN ai_audit_events.event_type IS 'Type of audit event: tool_execution, decision, access_check, approval, error, conversation';
COMMENT ON COLUMN ai_audit_events.severity IS 'Severity level: debug, info, warning, error, critical';
COMMENT ON COLUMN ai_audit_events.parameters IS 'Input parameters for tool executions (JSON)';
COMMENT ON COLUMN ai_audit_events.result IS 'Output/result of the operation (JSON)';
COMMENT ON COLUMN ai_audit_events.reasoning IS 'AI reasoning behind decisions';
COMMENT ON COLUMN ai_audit_events.alternatives IS 'Alternative options considered';
COMMENT ON COLUMN ai_audit_events.metadata IS 'Additional context data (JSON)';

COMMENT ON COLUMN ai_decision_trail.decision_chain IS 'Ordered array of decision IDs showing the chain of reasoning';
COMMENT ON COLUMN ai_decision_trail.confidence_scores IS 'Confidence scores corresponding to each decision in the chain';

-- Create a view for audit summaries (optional)
CREATE OR REPLACE VIEW ai_audit_summary AS
SELECT
    DATE_TRUNC('day', timestamp) as date,
    org_id,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users
FROM ai_audit_events
GROUP BY DATE_TRUNC('day', timestamp), org_id, event_type, severity
ORDER BY date DESC, event_count DESC;

-- Grant permissions (adjust based on your role structure)
-- Note: Adjust these grants based on your actual database roles
GRANT SELECT, INSERT ON ai_audit_events TO authenticated;
GRANT SELECT, INSERT ON ai_decision_trail TO authenticated;
GRANT SELECT ON ai_audit_summary TO authenticated;