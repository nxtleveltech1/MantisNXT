-- Migration: 0231_docustore_folders.sql
-- Description: Add folder management tables for hierarchical document organization

BEGIN;

-- Document folders table
CREATE TABLE IF NOT EXISTS docustore.document_folders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    parent_id uuid REFERENCES docustore.document_folders(id) ON DELETE CASCADE,
    icon text,
    color text, -- Hex color code
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT document_folders_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT document_folders_slug_not_empty CHECK (length(trim(slug)) > 0),
    CONSTRAINT document_folders_unique_org_slug UNIQUE(org_id, slug)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_folders_org_id ON docustore.document_folders(org_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_id ON docustore.document_folders(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_folders_slug ON docustore.document_folders(org_id, slug);

-- Trigger for document_folders.updated_at
CREATE TRIGGER document_folders_update_updated_at
    BEFORE UPDATE ON docustore.document_folders
    FOR EACH ROW
    EXECUTE FUNCTION docustore.update_updated_at();

-- Comments for documentation
COMMENT ON TABLE docustore.document_folders IS 'Hierarchical folder structure for organizing documents';

-- Insert migration record
INSERT INTO schema_migrations (migration_name)
VALUES ('0231_docustore_folders')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

