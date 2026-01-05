-- Migration: 0232_docustore_permissions.sql
-- Description: Add document permissions and sharing tables

BEGIN;

-- Permission type enum
DO $perm_enum$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_permission_type') THEN
        CREATE TYPE document_permission_type AS ENUM (
            'read',
            'write',
            'delete',
            'share'
        );
    END IF;
END$perm_enum$;

-- Document permissions table
CREATE TABLE IF NOT EXISTS docustore.document_permissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES docustore.documents(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    role_id uuid REFERENCES auth.roles(id) ON DELETE CASCADE,
    permission_type document_permission_type NOT NULL,
    granted_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT document_permissions_user_or_role CHECK (
        (user_id IS NOT NULL AND role_id IS NULL) OR
        (user_id IS NULL AND role_id IS NOT NULL)
    ),
    CONSTRAINT document_permissions_unique_user UNIQUE(document_id, user_id, permission_type) WHERE user_id IS NOT NULL,
    CONSTRAINT document_permissions_unique_role UNIQUE(document_id, role_id, permission_type) WHERE role_id IS NOT NULL
);

-- Document shares table (shareable links)
CREATE TABLE IF NOT EXISTS docustore.document_shares (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES docustore.documents(id) ON DELETE CASCADE,
    share_token text NOT NULL UNIQUE,
    access_level document_permission_type DEFAULT 'read',
    expires_at timestamptz,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT document_shares_token_not_empty CHECK (length(trim(share_token)) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_permissions_document_id ON docustore.document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user_id ON docustore.document_permissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_permissions_role_id ON docustore.document_permissions(role_id) WHERE role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_permissions_expires_at ON docustore.document_permissions(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON docustore.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_token ON docustore.document_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_document_shares_expires_at ON docustore.document_shares(expires_at) WHERE expires_at IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE docustore.document_permissions IS 'Access control for documents (user/role-based permissions)';
COMMENT ON TABLE docustore.document_shares IS 'Shareable links for documents';

-- Insert migration record
INSERT INTO schema_migrations (migration_name)
VALUES ('0232_docustore_permissions')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

