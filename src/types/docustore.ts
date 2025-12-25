// UPDATE: [2025-12-25] Enhanced DocuStore types with signing workflow, folders, and signer management

/**
 * DocuStore Enhanced Types
 * Supports document signing workflows, folder organization, and signer management
 */

// Signer status for document signing workflow
export type SignerStatus = 'pending' | 'signed' | 'declined' | 'expired';

// Document status for signing workflow
export type DocumentSigningStatus = 
  | 'draft' 
  | 'pending_your_signature' 
  | 'pending_other_signatures' 
  | 'completed' 
  | 'voided';

// Folder type for hierarchical organization
export interface DocuStoreFolder {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  documentCount: number;
  parentId?: string | null;
  children?: DocuStoreFolder[];
  createdAt: string;
  updatedAt: string;
}

// Signer represents a person who needs to sign the document
export interface DocumentSigner {
  id: string;
  documentId: string;
  email: string;
  name: string;
  role: 'signer' | 'approver' | 'viewer' | 'cc';
  status: SignerStatus;
  signedAt?: string | null;
  order: number;
  avatarUrl?: string | null;
  avatarInitials: string;
  avatarColor?: string;
}

// Recipient for CC'd parties
export interface DocumentRecipient {
  id: string;
  documentId: string;
  email: string;
  name?: string;
  type: 'cc' | 'bcc';
  sentAt?: string | null;
}

// Enhanced document for signing workflow
export interface SigningDocument {
  id: string;
  title: string;
  description?: string | null;
  documentType?: string | null;
  folderId?: string | null;
  folderName?: string | null;
  
  // Signing status
  signingStatus: DocumentSigningStatus;
  requiresMySignature: boolean;
  
  // Signers and recipients
  signers: DocumentSigner[];
  recipients: DocumentRecipient[];
  totalSigners: number;
  signedCount: number;
  
  // File info
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string;
  expiresAt?: string | null;
  completedAt?: string | null;
  
  // User info
  createdBy?: string;
  ownerId: string;
  ownerName?: string;
  
  // Metadata
  tags: string[];
  metadata?: Record<string, unknown>;
}

// Folder with nested documents
export interface FolderWithDocuments extends DocuStoreFolder {
  documents: SigningDocument[];
  isExpanded?: boolean;
}

// Status counts for sidebar
export interface StatusCounts {
  all: number;
  draft: number;
  pendingYourSignature: number;
  pendingOtherSignatures: number;
  completed: number;
  voided: number;
}

// Folder counts for sidebar
export interface FolderCounts {
  all: number;
  sharedWithMe: number;
  folders: { [folderId: string]: number };
  deleted: number;
}

// Document action types
export type DocumentAction = 
  | 'sign'
  | 'edit'
  | 'download'
  | 'resend'
  | 'void'
  | 'delete'
  | 'duplicate'
  | 'move'
  | 'share';

// Search/filter parameters
export interface DocuStoreFilters {
  search?: string;
  folderId?: string | null;
  status?: DocumentSigningStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  signerId?: string;
  ownerId?: string;
  tags?: string[];
  sortBy?: 'name' | 'date' | 'status' | 'lastEdit';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Advanced search fields
export interface AdvancedSearchParams extends DocuStoreFilters {
  documentType?: string;
  signerEmail?: string;
  signerName?: string;
  recipientEmail?: string;
  createdBy?: string;
  hasAttachments?: boolean;
  isExpired?: boolean;
}

// Pagination response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// Row item that can be either a folder or document
export type DocuStoreRowItem = 
  | { type: 'folder'; data: FolderWithDocuments }
  | { type: 'document'; data: SigningDocument };

// Bulk action types
export interface BulkActionParams {
  documentIds: string[];
  action: DocumentAction;
  targetFolderId?: string;
}

// Notification/reminder types
export interface SigningReminder {
  documentId: string;
  signerId: string;
  message?: string;
  sentAt: string;
}

// Helper to get avatar initials
export function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Helper to get status color
export function getSigningStatusColor(status: DocumentSigningStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-muted text-muted-foreground';
    case 'pending_your_signature':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'pending_other_signatures':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    case 'completed':
      return 'bg-success/10 text-success border-success/30';
    case 'voided':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

// Helper to get signer status color
export function getSignerStatusColor(status: SignerStatus): string {
  switch (status) {
    case 'signed':
      return 'text-success';
    case 'pending':
      return 'text-amber-500';
    case 'declined':
      return 'text-destructive';
    case 'expired':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}

// Helper to format signing status display
export function formatSigningStatus(status: DocumentSigningStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'pending_your_signature':
      return 'Pending your signature';
    case 'pending_other_signatures':
      return 'Pending other signatures';
    case 'completed':
      return 'Completed';
    case 'voided':
      return 'Voided';
    default:
      return status;
  }
}

