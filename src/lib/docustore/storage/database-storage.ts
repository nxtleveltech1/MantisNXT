/**
 * Database Storage Implementation for DocuStore
 * 
 * Stores files directly in the database as bytea.
 * Best for "on-platform" cloud storage without external dependencies.
 */

import { query } from '@/lib/database';
import { createHash } from 'crypto';
import type { StorageConfig, StoredFile, StorageResult } from './types';

export class DatabaseStorage {
  constructor(_config: StorageConfig) {
    // No specific config needed for DB storage yet as it uses the main DB
  }

  /**
   * Calculate SHA-256 checksum of file content
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Store a file in the database
   */
  async store(
    _documentId: string,
    type: 'version' | 'artifact',
    _filename: string,
    _content: Buffer,
    _mimeType: string,
    targetId?: string // This would be the version_id or artifact_id
  ): Promise<StorageResult> {
    try {
      // NOTE: The caller (DocumentService) usually creates the version/artifact record first.
      // However, we need the version_id or artifact_id to link the content.
      // We'll return a special path format for database storage: "db://[type]/[id]"
      
      return {
        success: true,
        path: `db://${type}/${targetId || 'pending'}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error storing file in database',
      };
    }
  }

  /**
   * Actually persist the content to the database
   * This is called by DocumentService after it has the version/artifact ID
   */
  async persistContent(
    targetId: string,
    type: 'version' | 'artifact',
    content: Buffer
  ): Promise<boolean> {
    try {
      const column = type === 'version' ? 'version_id' : 'artifact_id';
      await query(
        `INSERT INTO docustore.document_contents (${column}, content) 
         VALUES ($1, $2)
         ON CONFLICT (${column}) DO UPDATE SET content = EXCLUDED.content`,
        [targetId, content]
      );
      return true;
    } catch (error) {
      console.error('Failed to persist content to database:', error);
      return false;
    }
  }

  /**
   * Retrieve a file from the database
   */
  async retrieve(path: string): Promise<Buffer | null> {
    try {
      // Path format: db://version/[id] or db://artifact/[id]
      const parts = path.replace('db://', '').split('/');
      if (parts.length !== 2) return null;
      
      const type = parts[0];
      const id = parts[1];
      const column = type === 'version' ? 'version_id' : 'artifact_id';
      
      const result = await query<{ content: Buffer }>(
        `SELECT content FROM docustore.document_contents WHERE ${column} = $1`,
        [id]
      );
      
      if (result.rows.length === 0) return null;
      return result.rows[0].content;
    } catch (error) {
      console.error(`Failed to retrieve file from DB at ${path}:`, error);
      return null;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(path: string): Promise<StoredFile | null> {
    try {
      const buffer = await this.retrieve(path);
      if (!buffer) return null;
      
      const checksum = this.calculateChecksum(buffer);
      
      return {
        path,
        provider: 'database',
        size: buffer.length,
        mimeType: 'application/octet-stream', // Caller should know the real mime type
        checksum,
      };
    } catch (error) {
      console.error(`Failed to get metadata for file in DB at ${path}:`, error);
      return null;
    }
  }

  /**
   * Delete a file from the database
   */
  async delete(path: string): Promise<boolean> {
    try {
      const parts = path.replace('db://', '').split('/');
      if (parts.length !== 2) return false;
      
      const type = parts[0];
      const id = parts[1];
      const column = type === 'version' ? 'version_id' : 'artifact_id';
      
      await query(`DELETE FROM docustore.document_contents WHERE ${column} = $1`, [id]);
      return true;
    } catch (error) {
      console.error(`Failed to delete file from DB at ${path}:`, error);
      return false;
    }
  }

  /**
   * Check if file exists in the database
   */
  async exists(path: string): Promise<boolean> {
    try {
      const parts = path.replace('db://', '').split('/');
      if (parts.length !== 2) return false;
      
      const type = parts[0];
      const id = parts[1];
      const column = type === 'version' ? 'version_id' : 'artifact_id';
      
      const result = await query(
        `SELECT 1 FROM docustore.document_contents WHERE ${column} = $1`,
        [id]
      );
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }
}

