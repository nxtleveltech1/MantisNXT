/**
 * DocuStore Document Service
 * 
 * Core service for document management operations.
 */

import { query } from '@/lib/database';
import { StorageFactory } from '@/lib/docustore/storage';
import type {
  Document,
  DocumentVersion,
  DocumentArtifact,
  DocumentLink,
  DocumentEvent,
  DocumentWithRelations,
  CreateDocumentInput,
  UpdateDocumentInput,
  UploadVersionInput,
  CreateLinkInput,
  DocumentFilters,
} from './types';
import { v4 as uuidv4 } from 'uuid';

export class DocumentService {
  /**
   * Create a new document
   */
  static async createDocument(input: CreateDocumentInput): Promise<Document> {
    const documentId = uuidv4();
    
    const result = await query<Document>(
      `INSERT INTO docustore.documents (
        id, org_id, title, description, document_type, tags, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        documentId,
        input.org_id,
        input.title,
        input.description || null,
        input.document_type || null,
        input.tags || [],
        JSON.stringify(input.metadata || {}),
        input.created_by || null,
      ]
    );

    const document = result.rows[0];
    
    // Log event
    await query(
      `SELECT docustore.log_document_event($1, 'uploaded', $2, '{}'::jsonb)`,
      [documentId, input.created_by || null]
    );

    return document;
  }

  /**
   * Get document by ID with relations
   */
  static async getDocumentById(
    documentId: string,
    includeRelations: boolean = true
  ): Promise<DocumentWithRelations | null> {
    const docResult = await query<Document>(
      `SELECT * FROM docustore.documents WHERE id = $1 AND deleted_at IS NULL`,
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return null;
    }

    const document = docResult.rows[0];

    if (!includeRelations) {
      return { ...document, current_version: null, versions: [], artifacts: [], links: [], events: [] };
    }

    // Get current version
    let currentVersion: DocumentVersion | null = null;
    if (document.current_version_id) {
      const versionResult = await query<DocumentVersion>(
        `SELECT * FROM docustore.document_versions WHERE id = $1`,
        [document.current_version_id]
      );
      currentVersion = versionResult.rows[0] || null;
    }

    // Get all versions
    const versionsResult = await query<DocumentVersion>(
      `SELECT * FROM docustore.document_versions 
       WHERE document_id = $1 
       ORDER BY version_number DESC`,
      [documentId]
    );

    // Get artifacts
    const artifactsResult = await query<DocumentArtifact>(
      `SELECT * FROM docustore.document_artifacts 
       WHERE document_id = $1 
       ORDER BY created_at DESC`,
      [documentId]
    );

    // Get links
    const linksResult = await query<DocumentLink>(
      `SELECT * FROM docustore.document_links 
       WHERE document_id = $1 
       ORDER BY created_at DESC`,
      [documentId]
    );

    // Get recent events (last 50)
    const eventsResult = await query<DocumentEvent>(
      `SELECT * FROM docustore.document_events 
       WHERE document_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [documentId]
    );

    return {
      ...document,
      current_version: currentVersion,
      versions: versionsResult.rows,
      artifacts: artifactsResult.rows,
      links: linksResult.rows,
      events: eventsResult.rows,
    };
  }

  /**
   * List documents with filters
   */
  static async listDocuments(filters: DocumentFilters): Promise<{ documents: Document[]; total: number }> {
    const conditions: string[] = ['d.org_id = $1', 'd.deleted_at IS NULL'];
    const params: unknown[] = [filters.org_id];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`d.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.document_type) {
      conditions.push(`d.document_type = $${paramIndex}`);
      params.push(filters.document_type);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`d.tags && $${paramIndex}::text[]`);
      params.push(filters.tags);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.entity_type && filters.entity_id) {
      conditions.push(`EXISTS (
        SELECT 1 FROM docustore.document_links dl
        WHERE dl.document_id = d.id
        AND dl.entity_type = $${paramIndex}
        AND dl.entity_id = $${paramIndex + 1}
      )`);
      params.push(filters.entity_type);
      params.push(filters.entity_id);
      paramIndex += 2;
    }

    if (filters.created_from) {
      conditions.push(`d.created_at >= $${paramIndex}::timestamptz`);
      params.push(filters.created_from);
      paramIndex++;
    }

    if (filters.created_to) {
      conditions.push(`d.created_at <= $${paramIndex}::timestamptz`);
      params.push(filters.created_to);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM docustore.documents d WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get documents
    const docsResult = await query<Document>(
      `SELECT d.* FROM docustore.documents d 
       WHERE ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      documents: docsResult.rows,
      total,
    };
  }

  /**
   * Update document metadata
   */
  static async updateDocument(
    documentId: string,
    input: UpdateDocumentInput
  ): Promise<Document> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(input.title);
      paramIndex++;
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(input.description);
      paramIndex++;
    }

    if (input.document_type !== undefined) {
      updates.push(`document_type = $${paramIndex}`);
      params.push(input.document_type);
      paramIndex++;
    }

    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex}::text[]`);
      params.push(input.tags);
      paramIndex++;
    }

    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(input.metadata));
      paramIndex++;
    }

    if (input.updated_by !== undefined) {
      updates.push(`updated_by = $${paramIndex}`);
      params.push(input.updated_by);
      paramIndex++;
    }

    if (updates.length === 0) {
      const doc = await this.getDocumentById(documentId, false);
      if (!doc) throw new Error('Document not found');
      return doc;
    }

    updates.push(`updated_at = now()`);
    params.push(documentId);

    const result = await query<Document>(
      `UPDATE docustore.documents 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new Error('Document not found');
    }

    // Log event
    await query(
      `SELECT docustore.log_document_event($1, 'metadata_updated', $2, '{}'::jsonb)`,
      [documentId, input.updated_by || null]
    );

    return result.rows[0];
  }

  /**
   * Upload a new version of a document
   */
  static async uploadVersion(input: UploadVersionInput): Promise<DocumentVersion> {
    // Get next version number
    const versionResult = await query<{ version_number: number }>(
      `SELECT docustore.get_next_version_number($1) as version_number`,
      [input.document_id]
    );
    const versionNumber = versionResult.rows[0].version_number;

    // Store file
    const storage = StorageFactory.getDefault();
    const safeFilename = `${uuidv4()}_${input.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storeResult = await storage.store(
      input.document_id,
      'version',
      safeFilename,
      input.file,
      input.mime_type
    );

    if (!storeResult.success || !storeResult.path) {
      throw new Error(`Failed to store file: ${storeResult.error || 'Unknown error'}`);
    }

    // Get file metadata
    const fileMetadata = await storage.getMetadata(storeResult.path);
    if (!fileMetadata) {
      throw new Error('Failed to retrieve file metadata');
    }

    // Create version record
    const versionId = uuidv4();
    const versionResult2 = await query<DocumentVersion>(
      `INSERT INTO docustore.document_versions (
        id, document_id, version_number, storage_path, storage_provider,
        original_filename, mime_type, file_size, checksum_sha256, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        versionId,
        input.document_id,
        versionNumber,
        storeResult.path,
        'filesystem',
        input.filename,
        input.mime_type,
        fileMetadata.size,
        fileMetadata.checksum || null,
        input.uploaded_by || null,
      ]
    );

    const version = versionResult2.rows[0];

    // Update document's current_version_id
    await query(
      `UPDATE docustore.documents 
       SET current_version_id = $1, updated_at = now()
       WHERE id = $2`,
      [versionId, input.document_id]
    );

    // Log events
    await query(
      `SELECT docustore.log_document_event($1, 'version_created', $2, $3::jsonb)`,
      [
        input.document_id,
        input.uploaded_by || null,
        JSON.stringify({ version_id: versionId, version_number: versionNumber }),
      ]
    );

    return version;
  }

  /**
   * Create a document link
   */
  static async createLink(input: CreateLinkInput): Promise<DocumentLink> {
    const linkId = uuidv4();

    const result = await query<DocumentLink>(
      `INSERT INTO docustore.document_links (
        id, document_id, entity_type, entity_id, link_type, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        linkId,
        input.document_id,
        input.entity_type,
        input.entity_id,
        input.link_type || 'related',
        JSON.stringify(input.metadata || {}),
        input.created_by || null,
      ]
    );

    // Log event
    await query(
      `SELECT docustore.log_document_event($1, 'linked', $2, $3::jsonb)`,
      [
        input.document_id,
        input.created_by || null,
        JSON.stringify({ entity_type: input.entity_type, entity_id: input.entity_id }),
      ]
    );

    return result.rows[0];
  }

  /**
   * Delete a document link
   */
  static async deleteLink(linkId: string, documentId: string, userId?: string): Promise<void> {
    // Get link before deleting
    const linkResult = await query<DocumentLink>(
      `SELECT * FROM docustore.document_links WHERE id = $1`,
      [linkId]
    );

    if (linkResult.rows.length === 0) {
      throw new Error('Link not found');
    }

    const link = linkResult.rows[0];

    // Delete link
    await query(`DELETE FROM docustore.document_links WHERE id = $1`, [linkId]);

    // Log event
    await query(
      `SELECT docustore.log_document_event($1, 'unlinked', $2, $3::jsonb)`,
      [
        documentId,
        userId || null,
        JSON.stringify({ entity_type: link.entity_type, entity_id: link.entity_id }),
      ]
    );
  }

  /**
   * Soft delete a document
   */
  static async deleteDocument(documentId: string, userId?: string): Promise<void> {
    await query(
      `UPDATE docustore.documents 
       SET status = 'deleted', deleted_at = now(), deleted_by = $1
       WHERE id = $2`,
      [userId || null, documentId]
    );

    // Log event
    await query(
      `SELECT docustore.log_document_event($1, 'deleted', $2, '{}'::jsonb)`,
      [documentId, userId || null]
    );
  }

  /**
   * Restore a deleted document
   */
  static async restoreDocument(documentId: string, userId?: string): Promise<void> {
    await query(
      `UPDATE docustore.documents 
       SET status = 'active', deleted_at = NULL, deleted_by = NULL
       WHERE id = $1`,
      [documentId]
    );

    // Log event
    await query(
      `SELECT docustore.log_document_event($1, 'restored', $2, '{}'::jsonb)`,
      [documentId, userId || null]
    );
  }

  /**
   * Download file content
   */
  static async downloadFile(storagePath: string, storageProvider: string): Promise<Buffer | null> {
    const storage = StorageFactory.getDefault();
    return await storage.retrieve(storagePath);
  }

  /**
   * Log download event
   */
  static async logDownload(
    documentId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await query(
      `SELECT docustore.log_document_event($1, 'downloaded', $2, $3::jsonb)`,
      [documentId, userId || null, JSON.stringify(metadata || {})]
    );
  }
}



