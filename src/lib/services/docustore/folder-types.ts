/**
 * Folder Management Types
 */

export interface DocumentFolder {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  icon?: string | null;
  color?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderTree {
  folder: DocumentFolder;
  children: FolderTree[];
  document_count?: number;
}

export interface CreateFolderInput {
  org_id: string;
  name: string;
  parent_id?: string | null;
  icon?: string;
  color?: string;
  created_by?: string;
}

export interface UpdateFolderInput {
  name?: string;
  icon?: string;
  color?: string;
}

