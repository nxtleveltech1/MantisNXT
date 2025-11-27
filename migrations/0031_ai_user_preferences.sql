-- Migration: 0031_ai_user_preferences.sql
-- Description: Add user preferences and learning tables for AI personalization
-- Created: 2025-11-26

-- ============================================================================
-- AI USER PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    org_id UUID NOT NULL,
    expertise_level TEXT NOT NULL CHECK (expertise_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    response_style TEXT NOT NULL CHECK (response_style IN ('concise', 'detailed', 'technical', 'conversational')),
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- ============================================================================
-- AI LEARNING SIGNALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_learning_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('feedback', 'correction', 'preference_change', 'usage_pattern', 'interaction')),
    signal_data JSONB NOT NULL DEFAULT '{}',
    strength DECIMAL(3,2) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_user_id ON ai_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_org_id ON ai_user_preferences(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_expertise ON ai_user_preferences(expertise_level);
CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_style ON ai_user_preferences(response_style);

-- Learning signals indexes
CREATE INDEX IF NOT EXISTS idx_ai_learning_signals_user_id ON ai_learning_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_signals_type ON ai_learning_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_signals_timestamp ON ai_learning_signals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_learning_signals_strength ON ai_learning_signals(strength DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_learning_signals_user_type_time ON ai_learning_signals(user_id, signal_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_learning_signals_user_strength ON ai_learning_signals(user_id, strength DESC);

-- ============================================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================================

-- Enable RLS
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_signals ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY ai_user_preferences_user_access ON ai_user_preferences
    FOR ALL USING (user_id = current_user_id());

-- Users can only see their own learning signals
CREATE POLICY ai_learning_signals_user_access ON ai_learning_signals
    FOR ALL USING (user_id = current_user_id());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated at trigger for preferences
CREATE OR REPLACE FUNCTION update_ai_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_user_preferences_updated_at
    BEFORE UPDATE ON ai_user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_user_preferences_updated_at();

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default preferences for existing users (if any)
-- This will be handled by the application when users first access preferences

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ai_user_preferences IS 'Stores user preferences for AI personalization including expertise level and response style';
COMMENT ON TABLE ai_learning_signals IS 'Stores learning signals from user interactions to improve AI responses over time';

COMMENT ON COLUMN ai_user_preferences.expertise_level IS 'User expertise level: beginner, intermediate, advanced, expert';
COMMENT ON COLUMN ai_user_preferences.response_style IS 'Preferred response style: concise, detailed, technical, conversational';
COMMENT ON COLUMN ai_user_preferences.preferences IS 'Flexible JSON storage for additional user preferences';

COMMENT ON COLUMN ai_learning_signals.signal_type IS 'Type of learning signal: feedback, correction, preference_change, usage_pattern, interaction';
COMMENT ON COLUMN ai_learning_signals.signal_data IS 'Structured data about the learning signal';
COMMENT ON COLUMN ai_learning_signals.strength IS 'Strength/confidence of the learning signal (0.0 to 1.0)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Note: This migration creates the foundation for AI user preferences and learning.
-- The application will handle creating default preferences for users on first access.