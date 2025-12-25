/**
 * Signing Workflow Types
 */

export type SigningWorkflowStatus = 'draft' | 'pending' | 'in_progress' | 'completed' | 'voided' | 'expired';
export type SignerStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired';

export interface SigningWorkflow {
  id: string;
  document_id: string;
  status: SigningWorkflowStatus;
  expires_at?: string | null;
  reminder_settings: Record<string, unknown>;
  completed_at?: string | null;
  voided_at?: string | null;
  voided_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentSigner {
  id: string;
  workflow_id: string;
  user_id?: string | null;
  email: string;
  name: string;
  role?: string | null;
  order: number;
  status: SignerStatus;
  signed_at?: string | null;
  declined_at?: string | null;
  declined_reason?: string | null;
  viewed_at?: string | null;
  reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentSignature {
  id: string;
  signer_id: string;
  signature_data: string; // Base64-encoded
  ip_address?: string | null;
  user_agent?: string | null;
  signed_at: string;
}

export interface SigningRecipient {
  id: string;
  workflow_id: string;
  email: string;
  name?: string | null;
  type: 'cc' | 'bcc';
  sent_at?: string | null;
  created_at: string;
}

export interface CreateWorkflowInput {
  document_id: string;
  expires_at?: string;
  reminder_settings?: Record<string, unknown>;
  created_by?: string;
}

export interface SignerInput {
  user_id?: string;
  email: string;
  name: string;
  role?: string;
  order: number;
}

export interface RecipientInput {
  email: string;
  name?: string;
  type: 'cc' | 'bcc';
}

export interface SignatureMetadata {
  ip_address?: string;
  user_agent?: string;
}

export interface WorkflowStatus {
  workflow: SigningWorkflow;
  signers: DocumentSigner[];
  signatures: DocumentSignature[];
  recipients: SigningRecipient[];
  current_signer?: DocumentSigner | null;
  is_complete: boolean;
  is_expired: boolean;
}

