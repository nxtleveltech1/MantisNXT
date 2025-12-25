/**
 * Folder Management Service
 * 
 * Service for managing document folders and hierarchical organization.
 */

import { query } from '@/lib/database';
import type {
  DocumentFolder,
  FolderTree,
  CreateFolderInput,
  UpdateFolderInput,
  DocumentFilters,
} from './folder-types';
import type { Document } from './types';
import { v4 as uuidv4 } from 'uuid';

export class FolderService {
  /**
   * Create a new folder
   */
  static async createFolder(input: CreateFolderInput): Promise<DocumentFolder> {
    const folderId = uuidv4();

    // Generate slug from name
    const slug = input.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Validate parent exists if provided
    if (input.parent_id) {
      const parentResult = await query<DocumentFolder>(
        `SELECT id FROM docustore.document_folders WHERE id = $1 AND org_id = $2`,
        [input.parent_id, input.org_id]
      );

      if (parentResult.rows.length === 0) {
        throw new Error('Parent folder not found');
      }
    }

    const result = await query<DocumentFolder>(
      `INSERT INTO docustore.document_folders (
        id, org_id, name, slug, parent_id, icon, color, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        folderId,
        input.org_id,
        input.name.trim(),
        slug,
        input.parent_id || null,
        input.icon || null,
        input.color || null,
        input.created_by || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update folder metadata
   */
  static async updateFolder(folderId: string, input: UpdateFolderInput): Promise<DocumentFolder> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name.trim());
    }

    if (input.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(input.icon);
    }

    if (input.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(input.color);
    }

    if (updates.length === 0) {
      // Return existing folder if no updates
      const result = await query<DocumentFolder>(
        `SELECT * FROM docustore.document_folders WHERE id = $1`,
        [folderId]
      );
      if (result.rows.length === 0) {
        throw new Error('Folder not found');
      }
      return result.rows[0];
    }

    updates.push(`updated_at = now()`);
    values.push(folderId);

    const result = await query<DocumentFolder>(
      `UPDATE docustore.document_folders 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Folder not found');
    }

    return result.rows[0];
  }

  /**
   * Delete folder, optionally moving documents to another folder
   */
  static async deleteFolder(folderId: string, moveToFolderId?: string): Promise<void> {
    // If moving documents, update them first
    if (moveToFolderId !== undefined) {
      await query(
        `UPDATE docustore.documents 
         SET folder_id = $1, updated_at = now()
         WHERE folder_id = $2`,
        [moveToFolderId || null, folderId]
      );
    }

    // Delete folder (cascade will handle child folders if needed)
    await query(`DELETE FROM docustore.document_folders WHERE id = $1`, [folderId]);
  }

  /**
   * Get hierarchical folder structure
   */
  static async getFolderTree(orgId: string): Promise<FolderTree[]> {
    // Get all folders for org
    const foldersResult = await query<DocumentFolder>(
      `SELECT * FROM docustore.document_folders 
       WHERE org_id = $1 
       ORDER BY name ASC`,
      [orgId]
    );

    const folders = foldersResult.rows;

    // Get document counts per folder
    const countsResult = await query<{ folder_id: string; count: string }>(
      `SELECT folder_id, COUNT(*) as count 
       FROM docustore.documents 
       WHERE org_id = $1 AND folder_id IS NOT NULL AND deleted_at IS NULL
       GROUP BY folder_id`,
      [orgId]
    );

    const countsMap = new Map<string, number>();
    for (const row of countsResult.rows) {
      countsMap.set(row.folder_id, parseInt(row.count, 10));
    }

    // Build tree structure
    const folderMap = new Map<string, FolderTree>();
    const rootFolders: FolderTree[] = [];

    // Create tree nodes
    for (const folder of folders) {
      folderMap.set(folder.id, {
        folder,
        children: [],
        document_count: countsMap.get(folder.id) || 0,
      });
    }

    // Build parent-child relationships
    for (const folder of folders) {
      const treeNode = folderMap.get(folder.id)!;
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        const parentNode = folderMap.get(folder.parent_id)!;
        parentNode.children.push(treeNode);
      } else {
        rootFolders.push(treeNode);
      }
    }

    return rootFolders;
  }

  /**
   * Move document to folder (null = root)
   */
  static async moveDocument(documentId: string, folderId: string | null): Promise<void> {
    // Validate folder exists if provided
    if (folderId) {
      const folderResult = await query<DocumentFolder>(
        `SELECT id FROM docustore.document_folders WHERE id = $1`,
        [folderId]
      );

      if (folderResult.rows.length === 0) {
        throw new Error('Folder not found');
      }
    }

    await query(
      `UPDATE docustore.documents 
       SET folder_id = $1, updated_at = now()
       WHERE id = $2`,
      [folderId, documentId]
    );

    // Log event
    await query(
      `SELECT docustore.log_document_event($1, 'metadata_updated', NULL, $2::jsonb)`,
      [documentId, JSON.stringify({ folder_id: folderId })]
    );
  }

  /**
   * Get paginated documents in folder
   */
  static async getFolderDocuments(
    folderId: string,
    filters?: DocumentFilters
  ): Promise<{ documents: Document[]; total: number }> {
    const whereClauses: string[] = ['folder_id = $1', 'deleted_at IS NULL'];
    const values: unknown[] = [folderId];
    let paramIndex = 2;

    if (filters?.status) {
      whereClauses.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters?.document_type) {
      whereClauses.push(`document_type = $${paramIndex++}`);
      values.push(filters.document_type);
    }

    if (filters?.search) {
      whereClauses.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = whereClauses.join(' AND ');

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM docustore.documents WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Get documents with pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const documentsResult = await query<Document>(
      `SELECT * FROM docustore.documents 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      documents: documentsResult.rows,
      total,
    };
  }
}

