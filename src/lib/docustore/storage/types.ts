/**
 * DocuStore Storage Abstraction Types
 * 
 * Storage abstraction layer for DocuStore files.
 * Supports filesystem (default) with ability to swap to S3/R2 later.
 * Added 'database' provider for on-platform cloud storage.
 */

export type StorageProvider = 'filesystem' | 's3' | 'r2' | 'database';

export interface StorageConfig {
  provider: StorageProvider;
  basePath?: string; // For filesystem
  bucket?: string; // For S3/R2
  region?: string; // For S3/R2
  accessKeyId?: string; // For S3/R2
  secretAccessKey?: string; // For S3/R2
}

export interface StoredFile {
  path: string;
  provider: StorageProvider;
  size: number;
  mimeType: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export interface StorageResult {
  success: boolean;
  path?: string;
  error?: string;
}









