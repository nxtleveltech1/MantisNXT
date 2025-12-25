-- Migration: 0233_docustore_update_documents_table.sql
-- Description: Add folder_id, expires_at, and signing_workflow_id columns to documents table

BEGIN;

-- Add folder_id column
ALTER TABLE docustore.documents
    ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES docustore.document_folders(id) ON DELETE SET NULL;

-- Add expires_at column
ALTER TABLE docustore.documents
    ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Add signing_workflow_id column
ALTER TABLE docustore.documents
    ADD COLUMN IF NOT EXISTS signing_workflow_id uuid REFERENCES docustore.signing_workflows(id) ON DELETE SET NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON docustore.documents(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON docustore.documents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_signing_workflow_id ON docustore.documents(signing_workflow_id) WHERE signing_workflow_id IS NOT NULL;

-- Insert migration record
INSERT INTO schema_migrations (migration_name)
VALUES ('0233_docustore_update_documents_table')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

