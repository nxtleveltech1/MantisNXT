-- Migration: 0230_docustore_signing_workflow.sql
-- Description: Add signing workflow tables for document signing functionality

BEGIN;

-- Signing workflow status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signing_workflow_status') THEN
        CREATE TYPE signing_workflow_status AS ENUM (
            'draft',
            'pending',
            'in_progress',
            'completed',
            'voided',
            'expired'
        );
    END IF;
END$$;

-- Signer status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signer_status') THEN
        CREATE TYPE signer_status AS ENUM (
            'pending',
            'sent',
            'viewed',
            'signed',
            'declined',
            'expired'
        );
    END IF;
END$$;

-- Signing workflows table
CREATE TABLE IF NOT EXISTS docustore.signing_workflows (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES docustore.documents(id) ON DELETE CASCADE,
    status signing_workflow_status DEFAULT 'draft',
    expires_at timestamptz,
    reminder_settings jsonb DEFAULT '{}', -- e.g., {"enabled": true, "days_before": [7, 3, 1]}
    completed_at timestamptz,
    voided_at timestamptz,
    voided_reason text,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT signing_workflows_unique_document UNIQUE(document_id)
);

-- Document signers table
CREATE TABLE IF NOT EXISTS docustore.document_signers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id uuid NOT NULL REFERENCES docustore.signing_workflows(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    email text NOT NULL,
    name text NOT NULL,
    role text, -- e.g., 'signer', 'witness', 'approver'
    order integer NOT NULL CHECK (order > 0),
    status signer_status DEFAULT 'pending',
    signed_at timestamptz,
    declined_at timestamptz,
    declined_reason text,
    viewed_at timestamptz,
    reminder_sent_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT document_signers_unique_workflow_order UNIQUE(workflow_id, order),
    CONSTRAINT document_signers_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Document signatures table
CREATE TABLE IF NOT EXISTS docustore.document_signatures (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    signer_id uuid NOT NULL REFERENCES docustore.document_signers(id) ON DELETE CASCADE,
    signature_data text NOT NULL, -- Base64-encoded signature image/data
    ip_address inet,
    user_agent text,
    signed_at timestamptz DEFAULT now(),
    
    CONSTRAINT document_signatures_unique_signer UNIQUE(signer_id)
);

-- Signing recipients table (CC/BCC)
CREATE TABLE IF NOT EXISTS docustore.signing_recipients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id uuid NOT NULL REFERENCES docustore.signing_workflows(id) ON DELETE CASCADE,
    email text NOT NULL,
    name text,
    type text NOT NULL CHECK (type IN ('cc', 'bcc')),
    sent_at timestamptz,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT signing_recipients_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_signing_workflows_document_id ON docustore.signing_workflows(document_id);
CREATE INDEX IF NOT EXISTS idx_signing_workflows_status ON docustore.signing_workflows(status);
CREATE INDEX IF NOT EXISTS idx_signing_workflows_expires_at ON docustore.signing_workflows(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_signers_workflow_id ON docustore.document_signers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_document_signers_user_id ON docustore.document_signers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_signers_email ON docustore.document_signers(email);
CREATE INDEX IF NOT EXISTS idx_document_signers_status ON docustore.document_signers(status);
CREATE INDEX IF NOT EXISTS idx_document_signers_order ON docustore.document_signers(workflow_id, order);

CREATE INDEX IF NOT EXISTS idx_document_signatures_signer_id ON docustore.document_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signed_at ON docustore.document_signatures(signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_signing_recipients_workflow_id ON docustore.signing_recipients(workflow_id);
CREATE INDEX IF NOT EXISTS idx_signing_recipients_email ON docustore.signing_recipients(email);

-- Trigger for signing_workflows.updated_at
CREATE TRIGGER signing_workflows_update_updated_at
    BEFORE UPDATE ON docustore.signing_workflows
    FOR EACH ROW
    EXECUTE FUNCTION docustore.update_updated_at();

-- Trigger for document_signers.updated_at
CREATE TRIGGER document_signers_update_updated_at
    BEFORE UPDATE ON docustore.document_signers
    FOR EACH ROW
    EXECUTE FUNCTION docustore.update_updated_at();

-- Comments for documentation
COMMENT ON TABLE docustore.signing_workflows IS 'Signing workflow definitions for documents';
COMMENT ON TABLE docustore.document_signers IS 'Signer assignments for signing workflows';
COMMENT ON TABLE docustore.document_signatures IS 'Signature records with audit trail';
COMMENT ON TABLE docustore.signing_recipients IS 'CC/BCC recipients for signing workflows';

-- Insert migration record
INSERT INTO schema_migrations (migration_name)
VALUES ('0230_docustore_signing_workflow')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

