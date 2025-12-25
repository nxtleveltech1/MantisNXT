/**
 * Document Permissions Types
 */

export type PermissionType = 'read' | 'write' | 'delete' | 'share';

export interface DocumentPermission {
  id: string;
  document_id: string;
  user_id?: string | null;
  role_id?: string | null;
  permission_type: PermissionType;
  granted_by?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  share_token: string;
  access_level: PermissionType;
  expires_at?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface GrantPermissionInput {
  document_id: string;
  user_id?: string;
  role_id?: string;
  permission_type: PermissionType;
  expires_at?: string;
  granted_by?: string;
}

export interface CreateShareLinkInput {
  document_id: string;
  access_level?: PermissionType;
  expires_at?: string;
  created_by?: string;
}

