-- Migration: 0220_auth_password_reset_tokens.sql
-- Description: Add password reset tokens table for forgot password flow
-- Created: 2025-12-08

-- ============================================================================
-- Password Reset Tokens Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each user can only have one active reset token at a time
  CONSTRAINT unique_active_reset_token UNIQUE (user_id, token_hash)
);

-- Index for token lookup (filter by used_at only - expiry checked in query)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
ON auth.password_reset_tokens(token_hash)
WHERE used_at IS NULL;

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires 
ON auth.password_reset_tokens(expires_at);

-- ============================================================================
-- Email Verification Tokens Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_email_verification_token UNIQUE (user_id, token_hash)
);

-- Index for token lookup (filter by verified_at only - expiry checked in query)
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash
ON auth.email_verification_tokens(token_hash)
WHERE verified_at IS NULL;

-- ============================================================================
-- Add missing columns to users_extended if they don't exist
-- ============================================================================

-- Add password_hash column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users_extended' 
    AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE auth.users_extended ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- Add failed_login_attempts column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users_extended' 
    AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE auth.users_extended ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add locked_until column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users_extended' 
    AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE auth.users_extended ADD COLUMN locked_until TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE auth.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Password reset tokens are only accessible by system (no user access)
-- Tokens are looked up by hash, not by user_id in the API

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.password_reset_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.email_verification_tokens TO authenticated;

-- ============================================================================
-- Cleanup function for expired tokens
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  -- Delete expired password reset tokens older than 24 hours past expiry
  DELETE FROM auth.password_reset_tokens 
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  -- Delete expired email verification tokens older than 7 days past expiry
  DELETE FROM auth.email_verification_tokens 
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE auth.password_reset_tokens IS 'Stores hashed password reset tokens for forgot password flow';
COMMENT ON TABLE auth.email_verification_tokens IS 'Stores hashed email verification tokens for new accounts';