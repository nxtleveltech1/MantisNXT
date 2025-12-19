-- Migration: 0224_docustore.sql
-- Description: DocuStore module - Document warehouse with versioning, artifacts, entity linking, and audit trail

BEGIN;

-- Create docustore schema
CREATE SCHEMA IF NOT EXISTS docustore;

-- Document event type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'docustore_event_type') THEN
        CREATE TYPE docustore_event_type AS ENUM (
            'uploaded',
            'metadata_updated',
            'linked',
            'unlinked',
            'pdf_generated',
            'downloaded',
            'deleted',
            'restored',
            'version_created',
            'artifact_created'
        );
    END IF;
END$$;

-- Documents table: main document container
CREATE TABLE IF NOT EXISTS docustore.documents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    document_type text, -- e.g., 'invoice', 'quotation', 'contract', 'certificate', 'general'
    tags text[] DEFAULT '{}',
    status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    current_version_id uuid, -- FK to document_versions
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    deleted_at timestamptz,
    deleted_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT documents_title_not_empty CHECK (length(trim(title)) > 0)
);

-- Document versions: immutable versions of uploaded files
CREATE TABLE IF NOT EXISTS docustore.document_versions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES docustore.documents(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    storage_path text NOT NULL, -- filesystem path or S3 key
    storage_provider text DEFAULT 'filesystem' CHECK (storage_provider IN ('filesystem', 's3', 'r2')),
    original_filename text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL CHECK (file_size >= 0),
    checksum_sha256 text, -- SHA-256 hash for integrity verification
    uploaded_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT document_versions_version_positive CHECK (version_number > 0),
    CONSTRAINT document_versions_unique_doc_version UNIQUE(document_id, version_number)
);

-- Document artifacts: generated PDF outputs
CREATE TABLE IF NOT EXISTS docustore.document_artifacts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES docustore.documents(id) ON DELETE CASCADE,
    artifact_type text NOT NULL CHECK (artifact_type IN ('docustore_record', 'audit_pack', 'custom')),
    version_id uuid REFERENCES docustore.document_versions(id) ON DELETE SET NULL, -- source version if applicable
    storage_path text NOT NULL,
    storage_provider text DEFAULT 'filesystem' CHECK (storage_provider IN ('filesystem', 's3', 'r2')),
    filename text NOT NULL,
    mime_type text DEFAULT 'application/pdf',
    file_size bigint NOT NULL CHECK (file_size >= 0),
    checksum_sha256 text,
    metadata jsonb DEFAULT '{}', -- e.g., generation params, template used
    generated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Document links: polymorphic links to platform entities
CREATE TABLE IF NOT EXISTS docustore.document_links (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES docustore.documents(id) ON DELETE CASCADE,
    entity_type text NOT NULL, -- e.g., 'customer', 'supplier', 'invoice', 'quotation', 'sales_order', 'product'
    entity_id uuid NOT NULL,
    link_type text DEFAULT 'related', -- e.g., 'related', 'attached', 'generated_from'
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT document_links_unique_link UNIQUE(document_id, entity_type, entity_id)
);

-- Document events: append-only audit log
CREATE TABLE IF NOT EXISTS docustore.document_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES docustore.documents(id) ON DELETE CASCADE,
    event_type docustore_event_type NOT NULL,
    user_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}', -- e.g., old_value, new_value, entity_type, entity_id
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON docustore.documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON docustore.documents(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON docustore.documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON docustore.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON docustore.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON docustore.documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON docustore.documents USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON docustore.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON docustore.document_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_artifacts_document_id ON docustore.document_artifacts(document_id);
CREATE INDEX IF NOT EXISTS idx_document_artifacts_type ON docustore.document_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_document_artifacts_created_at ON docustore.document_artifacts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_links_document_id ON docustore.document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_links_entity ON docustore.document_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_links_entity_type ON docustore.document_links(entity_type);

CREATE INDEX IF NOT EXISTS idx_document_events_document_id ON docustore.document_events(document_id);
CREATE INDEX IF NOT EXISTS idx_document_events_event_type ON docustore.document_events(event_type);
CREATE INDEX IF NOT EXISTS idx_document_events_created_at ON docustore.document_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_events_user_id ON docustore.document_events(user_id);

-- Foreign key: documents.current_version_id -> document_versions.id
ALTER TABLE docustore.documents
    ADD CONSTRAINT documents_current_version_fk 
    FOREIGN KEY (current_version_id) 
    REFERENCES docustore.document_versions(id) 
    ON DELETE SET NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION docustore.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for documents.updated_at
CREATE TRIGGER documents_update_updated_at
    BEFORE UPDATE ON docustore.documents
    FOR EACH ROW
    EXECUTE FUNCTION docustore.update_updated_at();

-- Function to log document events
CREATE OR REPLACE FUNCTION docustore.log_document_event(
    p_document_id uuid,
    p_event_type docustore_event_type,
    p_user_id uuid DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
    v_event_id uuid;
BEGIN
    INSERT INTO docustore.document_events (
        document_id,
        event_type,
        user_id,
        metadata
    ) VALUES (
        p_document_id,
        p_event_type,
        p_user_id,
        p_metadata
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next version number for a document
CREATE OR REPLACE FUNCTION docustore.get_next_version_number(p_document_id uuid)
RETURNS integer AS $$
DECLARE
    v_max_version integer;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) INTO v_max_version
    FROM docustore.document_versions
    WHERE document_id = p_document_id;
    
    RETURN v_max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON SCHEMA docustore IS 'Document warehouse module: unified document storage with versioning, artifacts, entity linking, and audit trail';
COMMENT ON TABLE docustore.documents IS 'Main document container with current metadata snapshot';
COMMENT ON TABLE docustore.document_versions IS 'Immutable versions of uploaded files';
COMMENT ON TABLE docustore.document_artifacts IS 'Generated PDF artifacts (e.g., DocuStoreRecord, AuditPack)';
COMMENT ON TABLE docustore.document_links IS 'Polymorphic links to platform entities (customer, supplier, invoice, etc.)';
COMMENT ON TABLE docustore.document_events IS 'Append-only audit log for all document lifecycle events';

-- Insert migration record
INSERT INTO schema_migrations (migration_name)
VALUES ('0224_docustore')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;







