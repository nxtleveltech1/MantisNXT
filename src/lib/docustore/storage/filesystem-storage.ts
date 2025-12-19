/**
 * Filesystem Storage Implementation for DocuStore
 * 
 * Stores files on the local filesystem with organized directory structure.
 */

import { mkdir, writeFile, readFile, unlink, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import type { StorageConfig, StoredFile, StorageResult } from './types';

export class FilesystemStorage {
  private basePath: string;

  constructor(config: StorageConfig) {
    this.basePath = config.basePath || process.env.DOCUSTORE_STORAGE_PATH || '/app/docustore';
  }

  /**
   * Generate storage path for a document version or artifact
   */
  private getStoragePath(documentId: string, type: 'version' | 'artifact', filename: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Structure: basePath/YYYY/MM/DD/documentId/type/filename
    return join(this.basePath, String(year), month, day, documentId, type, filename);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(path: string): Promise<void> {
    try {
      await mkdir(dirname(path), { recursive: true });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Calculate SHA-256 checksum of file content
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Store a file
   */
  async store(
    documentId: string,
    type: 'version' | 'artifact',
    filename: string,
    content: Buffer,
    _mimeType: string
  ): Promise<StorageResult> {
    try {
      const storagePath = this.getStoragePath(documentId, type, filename);
      await this.ensureDirectory(storagePath);
      
      await writeFile(storagePath, content);
      
      // const checksum = this.calculateChecksum(content);
      
      return {
        success: true,
        path: storagePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error storing file',
      };
    }
  }

  /**
   * Retrieve a file
   */
  async retrieve(path: string): Promise<Buffer | null> {
    try {
      return await readFile(path);
    } catch (error) {
      console.error(`Failed to retrieve file at ${path}:`, error);
      return null;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(path: string): Promise<StoredFile | null> {
    try {
      const stats = await stat(path);
      const content = await readFile(path);
      const checksum = this.calculateChecksum(content);
      
      // Try to infer mime type from extension
      const ext = path.split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === 'pdf') mimeType = 'application/pdf';
      else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      return {
        path,
        provider: 'filesystem',
        size: stats.size,
        mimeType,
        checksum,
      };
    } catch (error) {
      console.error(`Failed to get metadata for file at ${path}:`, error);
      return null;
    }
  }

  /**
   * Delete a file
   */
  async delete(path: string): Promise<boolean> {
    try {
      await unlink(path);
      return true;
    } catch (error) {
      console.error(`Failed to delete file at ${path}:`, error);
      return false;
    }
  }

  /**
   * Check if file exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }
}








