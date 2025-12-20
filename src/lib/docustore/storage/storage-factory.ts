/**
 * Storage Factory for DocuStore
 * 
 * Creates appropriate storage implementation based on configuration.
 */

import type { StorageConfig } from './types';
import { FilesystemStorage } from './filesystem-storage';
import { DatabaseStorage } from './database-storage';
// Future: import { S3Storage } from './s3-storage';
// Future: import { R2Storage } from './r2-storage';

export type StorageInstance = FilesystemStorage | DatabaseStorage; // | S3Storage | R2Storage;

export class StorageFactory {
  static create(config: StorageConfig): StorageInstance {
    switch (config.provider) {
      case 'filesystem':
        return new FilesystemStorage(config);
      case 'database':
        return new DatabaseStorage(config);
      // Future: case 's3':
      //   return new S3Storage(config);
      // Future: case 'r2':
      //   return new R2Storage(config);
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  /**
   * Get default storage instance
   */
  static getDefault(): StorageInstance {
    const config: StorageConfig = {
      provider: (process.env.DOCUSTORE_STORAGE_PROVIDER as StorageConfig['provider']) || 'database',
      basePath: process.env.DOCUSTORE_STORAGE_PATH || '/app/docustore',
    };
    return StorageFactory.create(config);
  }
}










