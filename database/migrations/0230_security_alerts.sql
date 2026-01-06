-- Security Alerts Table for Admin Dashboard
-- Tracks failed logins, suspicious activity, and manual security flags
-- Date: 2026-01-07

BEGIN;

-- Create security_alerts table in auth schema
CREATE TABLE IF NOT EXISTS auth.security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert classification
    alert_type TEXT NOT NULL CHECK (alert_type IN ('failed_login', 'suspicious_activity', 'brute_force', 'unusual_location', 'manual')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')) DEFAULT 'pending',
    
    -- Source information
    ip_address INET,
    user_agent TEXT,
    location JSONB, -- {country, city, region}
    
    -- User association (if applicable)
    user_id UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    user_email TEXT,
    
    -- Alert details
    title TEXT NOT NULL,
    description TEXT,
    details JSONB DEFAULT '{}',
    
    -- Related events count (for aggregated alerts like brute force)
    event_count INTEGER DEFAULT 1,
    first_occurrence TIMESTAMPTZ DEFAULT NOW(),
    last_occurrence TIMESTAMPTZ DEFAULT NOW(),
    
    -- Review tracking
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON auth.security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON auth.security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON auth.security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON auth.security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON auth.security_alerts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_alerts_ip ON auth.security_alerts(ip_address) WHERE ip_address IS NOT NULL;

-- Create composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_security_alerts_dashboard 
ON auth.security_alerts(status, created_at DESC) 
WHERE status = 'pending';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION auth.update_security_alert_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_security_alerts_updated ON auth.security_alerts;
CREATE TRIGGER trigger_security_alerts_updated
    BEFORE UPDATE ON auth.security_alerts
    FOR EACH ROW
    EXECUTE FUNCTION auth.update_security_alert_timestamp();

-- Function to create security alert from failed login
CREATE OR REPLACE FUNCTION auth.create_failed_login_alert(
    p_user_email TEXT,
    p_ip_address INET,
    p_user_agent TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_alert_id UUID;
    v_existing_alert UUID;
    v_event_count INTEGER;
BEGIN
    -- Check for existing brute force alert from same IP in last hour
    SELECT id, event_count INTO v_existing_alert, v_event_count
    FROM auth.security_alerts
    WHERE ip_address = p_ip_address
      AND alert_type IN ('failed_login', 'brute_force')
      AND status = 'pending'
      AND created_at >= NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_existing_alert IS NOT NULL THEN
        -- Update existing alert
        UPDATE auth.security_alerts
        SET event_count = event_count + 1,
            last_occurrence = NOW(),
            -- Escalate to brute_force after 5 attempts
            alert_type = CASE WHEN event_count >= 4 THEN 'brute_force' ELSE alert_type END,
            severity = CASE 
                WHEN event_count >= 10 THEN 'critical'
                WHEN event_count >= 5 THEN 'high'
                WHEN event_count >= 3 THEN 'medium'
                ELSE severity
            END,
            title = CASE 
                WHEN event_count >= 4 THEN 'Brute force attack detected'
                ELSE title
            END,
            description = 'Multiple failed login attempts from IP ' || p_ip_address::TEXT || ' (' || (event_count + 1)::TEXT || ' attempts)'
        WHERE id = v_existing_alert
        RETURNING id INTO v_alert_id;
    ELSE
        -- Create new alert
        INSERT INTO auth.security_alerts (
            alert_type,
            severity,
            ip_address,
            user_agent,
            user_id,
            user_email,
            title,
            description
        ) VALUES (
            'failed_login',
            'low',
            p_ip_address,
            p_user_agent,
            p_user_id,
            p_user_email,
            'Failed login attempt',
            'Failed login attempt for ' || COALESCE(p_user_email, 'unknown user') || ' from IP ' || p_ip_address::TEXT
        ) RETURNING id INTO v_alert_id;
    END IF;
    
    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON auth.security_alerts TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

COMMIT;

