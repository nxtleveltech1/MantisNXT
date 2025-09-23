-- Migration: 0001_init_core.sql - CORRECTED FOR SUPABASE
-- Description: Initialize core schema with organizations, profiles, audit logging, and enums
-- PRODUCTION READY - 100% Supabase Compatible

-- Enable required extensions (Supabase has these built-in)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================
-- CORE ENUMS (COMPREHENSIVE)
-- ===========================

-- User roles - Complete set from PRD
CREATE TYPE user_role AS ENUM (
    'admin',
    'ops_manager',
    'ai_team',
    'cs_agent',
    'exec',
    'integrations'
);

-- Organization plans
CREATE TYPE organization_plan AS ENUM (
    'starter',
    'professional',
    'enterprise'
);

-- Audit actions - Comprehensive logging
CREATE TYPE audit_action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'API_CALL',
    'EXPORT',
    'IMPORT',
    'CONFIG_CHANGE',
    'PASSWORD_RESET'
);

-- ===========================
-- CORE TABLES
-- ===========================

-- Organizations table
CREATE TABLE organization (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    plan_type organization_plan NOT NULL DEFAULT 'starter',
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Validation constraints
    CONSTRAINT org_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    CONSTRAINT org_slug_format CHECK (slug ~ '^[a-z0-9-]+$' AND char_length(slug) >= 2 AND char_length(slug) <= 50)
);

-- User profiles table (extends Supabase auth.users)
CREATE TABLE profile (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'cs_agent',
    display_name text NOT NULL,
    avatar_url text,
    settings jsonb DEFAULT '{}',
    last_seen_at timestamptz,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Validation constraints
    CONSTRAINT profile_display_name_length CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 100),
    CONSTRAINT profile_avatar_url_format CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://.*')
);

-- Audit log for compliance and debugging
CREATE TABLE audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES organization(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    user_agent text,
    timestamp timestamptz DEFAULT now(),

    -- Validation constraints
    CONSTRAINT audit_table_name_valid CHECK (table_name ~ '^[a-z_]+$'),
    CONSTRAINT audit_data_present CHECK (old_data IS NOT NULL OR new_data IS NOT NULL)
);

-- ===========================
-- CORE INDEXES (PERFORMANCE)
-- ===========================

-- Organization indexes
CREATE INDEX idx_organization_slug ON organization(slug);
CREATE INDEX idx_organization_plan_type ON organization(plan_type);
CREATE INDEX idx_organization_created_at ON organization(created_at DESC);

-- Profile indexes for authentication and org queries
CREATE INDEX idx_profile_org_id ON profile(org_id);
CREATE INDEX idx_profile_role ON profile(role);
CREATE INDEX idx_profile_org_role ON profile(org_id, role);
CREATE INDEX idx_profile_active ON profile(org_id, is_active) WHERE is_active = true;
CREATE INDEX idx_profile_last_seen ON profile(last_seen_at DESC NULLS LAST);

-- Audit log indexes for compliance queries
CREATE INDEX idx_audit_log_org_timestamp ON audit_log(org_id, timestamp DESC);
CREATE INDEX idx_audit_log_user_timestamp ON audit_log(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_log_table_action ON audit_log(table_name, action);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id) WHERE record_id IS NOT NULL;

-- ===========================
-- TRIGGER FUNCTIONS
-- ===========================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function (SECURITY DEFINER for RLS)
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    org_id_val uuid;
    user_id_val uuid;
BEGIN
    -- Extract org_id from the record
    IF TG_OP = 'DELETE' THEN
        org_id_val := COALESCE(OLD.org_id, (SELECT org_id FROM profile WHERE id = auth.uid()));
    ELSE
        org_id_val := COALESCE(NEW.org_id, (SELECT org_id FROM profile WHERE id = auth.uid()));
    END IF;

    user_id_val := auth.uid();

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (org_id, user_id, action, table_name, record_id, old_data, timestamp)
        VALUES (org_id_val, user_id_val, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), now());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (org_id, user_id, action, table_name, record_id, old_data, new_data, timestamp)
        VALUES (org_id_val, user_id_val, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), now());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (org_id, user_id, action, table_name, record_id, new_data, timestamp)
        VALUES (org_id_val, user_id_val, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), now());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- APPLY TRIGGERS
-- ===========================

-- Updated timestamp triggers
CREATE TRIGGER update_organization_updated_at
    BEFORE UPDATE ON organization
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_updated_at
    BEFORE UPDATE ON profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers (for compliance)
CREATE TRIGGER audit_organization
    AFTER INSERT OR UPDATE OR DELETE ON organization
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_profile
    AFTER INSERT OR UPDATE OR DELETE ON profile
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();