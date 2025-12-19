-- Migration: 0229_docustore_db_storage.sql
-- Description: Add database storage for DocuStore files

BEGIN;

CREATE TABLE IF NOT EXISTS docustore.document_contents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id uuid REFERENCES docustore.document_versions(id) ON DELETE CASCADE,
    artifact_id uuid REFERENCES docustore.document_artifacts(id) ON DELETE CASCADE,
    content bytea NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT one_target_check CHECK (
        (version_id IS NOT NULL AND artifact_id IS NULL) OR
        (version_id IS NULL AND artifact_id IS NOT NULL)
    ),
    CONSTRAINT unique_version_content UNIQUE (version_id),
    CONSTRAINT unique_artifact_content UNIQUE (artifact_id)
);

CREATE INDEX IF NOT EXISTS idx_document_contents_version_id ON docustore.document_contents(version_id);
CREATE INDEX IF NOT EXISTS idx_document_contents_artifact_id ON docustore.document_contents(artifact_id);

-- Update storage_provider enum check if possible, or just allow 'database'
-- The existing check was: CHECK (storage_provider IN ('filesystem', 's3', 'r2'))
-- We need to drop and recreate the constraint if we want it strict, or just use it.
-- For now, document_versions and document_artifacts have this check.

ALTER TABLE docustore.document_versions DROP CONSTRAINT IF EXISTS document_versions_storage_provider_check;
ALTER TABLE docustore.document_versions ADD CONSTRAINT document_versions_storage_provider_check 
    CHECK (storage_provider IN ('filesystem', 's3', 'r2', 'database'));

ALTER TABLE docustore.document_artifacts DROP CONSTRAINT IF EXISTS document_artifacts_storage_provider_check;
ALTER TABLE docustore.document_artifacts ADD CONSTRAINT document_artifacts_storage_provider_check 
    CHECK (storage_provider IN ('filesystem', 's3', 'r2', 'database'));

-- Insert migration record
INSERT INTO schema_migrations (migration_name)
VALUES ('0229_docustore_db_storage')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

