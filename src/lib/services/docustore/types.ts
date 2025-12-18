/**
 * DocuStore Service Types
 */

export interface Document {
  id: string;
  org_id: string;
  title: string;
  description?: string | null;
  document_type?: string | null;
  tags: string[];
  status: 'active' | 'archived' | 'deleted';
  current_version_id?: string | null;
  metadata: Record<string, unknown>;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  storage_provider: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  checksum_sha256?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

export interface DocumentArtifact {
  id: string;
  document_id: string;
  artifact_type: 'docustore_record' | 'audit_pack' | 'custom';
  version_id?: string | null;
  storage_path: string;
  storage_provider: string;
  filename: string;
  mime_type: string;
  file_size: number;
  checksum_sha256?: string | null;
  metadata: Record<string, unknown>;
  generated_by?: string | null;
  created_at: string;
}

export interface DocumentLink {
  id: string;
  document_id: string;
  entity_type: string;
  entity_id: string;
  link_type: string;
  metadata: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
}

export interface DocumentEvent {
  id: string;
  document_id: string;
  event_type:
    | 'uploaded'
    | 'metadata_updated'
    | 'linked'
    | 'unlinked'
    | 'pdf_generated'
    | 'downloaded'
    | 'deleted'
    | 'restored'
    | 'version_created'
    | 'artifact_created';
  user_id?: string | null;
  metadata: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface DocumentWithRelations extends Document {
  current_version?: DocumentVersion | null;
  versions?: DocumentVersion[];
  artifacts?: DocumentArtifact[];
  links?: DocumentLink[];
  events?: DocumentEvent[];
}

export interface CreateDocumentInput {
  org_id: string;
  title: string;
  description?: string;
  document_type?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  document_type?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  updated_by?: string;
}

export interface UploadVersionInput {
  document_id: string;
  file: Buffer;
  filename: string;
  mime_type: string;
  uploaded_by?: string;
}

export interface CreateLinkInput {
  document_id: string;
  entity_type: string;
  entity_id: string;
  link_type?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface DocumentFilters {
  org_id: string;
  status?: 'active' | 'archived' | 'deleted';
  document_type?: string;
  tags?: string[];
  entity_type?: string;
  entity_id?: string;
  search?: string; // Search in title/description
  created_from?: string;
  created_to?: string;
  limit?: number;
  offset?: number;
}



