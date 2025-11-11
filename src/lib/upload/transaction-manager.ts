import { PoolClient } from 'pg';
import { withTransaction } from '@/lib/database';
import crypto from 'crypto';
import {
  PriceListUpload,
  BulkImportJob,
  ImportSummary
} from '@/types/pricelist-upload';

export interface TransactionContext {
  client: PoolClient;
  rollback: () => Promise<void>;
  commit: () => Promise<void>;
  isRolledBack: boolean;
  isCommitted: boolean;
}

export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors: string[];
  duration: number;
}

export class TransactionManager {

  /**
   * Execute operations within a managed transaction with automatic rollback on error
   */
  static async withManagedTransaction<T>(
    operation: (context: TransactionContext) => Promise<T>
  ): Promise<T> {
    return await withTransaction(async (client) => {
      let isRolledBack = false;
      let isCommitted = false;

      const context: TransactionContext = {
        client,
        rollback: async () => {
          if (!isRolledBack && !isCommitted) {
            await client.query('ROLLBACK');
            isRolledBack = true;
          }
        },
        commit: async () => {
          if (!isRolledBack && !isCommitted) {
            await client.query('COMMIT');
            isCommitted = true;
          }
        },
        isRolledBack,
        isCommitted
      };

      try {
        await client.query('BEGIN');
        const result = await operation(context);

        if (!isRolledBack && !isCommitted) {
          await client.query('COMMIT');
          isCommitted = true;
        }

        return result;
      } catch (error) {
        if (!isRolledBack && !isCommitted) {
          await client.query('ROLLBACK');
          isRolledBack = true;
        }
        throw error;
      }
    });
  }

  /**
   * Execute batch operations with progress tracking and error handling
   */
  static async executeBatchOperation<T>(
    items: T[],
    operation: (item: T, index: number, client: PoolClient) => Promise<void>,
    options: {
      batchSize?: number;
      maxConcurrency?: number;
      onProgress?: (completed: number, total: number) => void;
      onError?: (error: Error, item: T, index: number) => void;
      stopOnError?: boolean;
      retryAttempts?: number;
      retryDelay?: number;
    } = {}
  ): Promise<BatchOperationResult> {
    const {
      batchSize = 100,
      maxConcurrency = 5,
      onProgress,
      onError,
      stopOnError = false,
      retryAttempts = 2,
      retryDelay = 1000
    } = options;

    const startTime = Date.now();
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process items in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      try {
        await this.withManagedTransaction(async (context) => {
          // Process batch with concurrency control
          const semaphore = new Semaphore(maxConcurrency);
          const batchPromises = batch.map(async (item, batchIndex) => {
            const globalIndex = i + batchIndex;

            return semaphore.acquire(async () => {
              let attempts = 0;
              let lastError: Error | null = null;

              while (attempts <= retryAttempts) {
                try {
                  await operation(item, globalIndex, context.client);
                  successful++;
                  if (onProgress) {
                    onProgress(successful + failed, items.length);
                  }
                  return;
                } catch (error) {
                  lastError = error as Error;
                  attempts++;

                  if (attempts <= retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                  }
                }
              }

              // All retry attempts failed
              failed++;
              const errorMsg = `Item ${globalIndex}: ${lastError?.message || 'Unknown error'}`;
              errors.push(errorMsg);

              if (onError && lastError) {
                onError(lastError, item, globalIndex);
              }

              if (stopOnError) {
                throw lastError;
              }
            });
          });

          await Promise.all(batchPromises);
        });

      } catch (error) {
        if (stopOnError) {
          break;
        }
      }
    }

    return {
      successful,
      failed,
      errors,
      duration: Date.now() - startTime
    };
  }

  /**
   * Create a savepoint within a transaction
   */
  static async createSavepoint(client: PoolClient, name: string): Promise<void> {
    await client.query(`SAVEPOINT ${name}`);
  }

  /**
   * Rollback to a savepoint
   */
  static async rollbackToSavepoint(client: PoolClient, name: string): Promise<void> {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  /**
   * Release a savepoint
   */
  static async releaseSavepoint(client: PoolClient, name: string): Promise<void> {
    await client.query(`RELEASE SAVEPOINT ${name}`);
  }

  /**
   * Execute bulk import with transaction safety and progress tracking
   */
  static async executeBulkImport(
    uploadIds: string[],
    options: {
      batchSize?: number;
      validateBeforeImport?: boolean;
      stopOnError?: boolean;
      onProgress?: (progress: BulkImportProgress) => void;
    } = {}
  ): Promise<BulkImportJob> {
    const {
      batchSize = 50,
      validateBeforeImport = true,
      stopOnError = false,
      onProgress
    } = options;

    // Create bulk import job record
    const jobId = crypto.randomUUID();
    const job: BulkImportJob = {
      id: jobId,
      uploads: uploadIds,
      status: 'pending',
      config: {
        batchSize,
        parallelProcessing: true,
        validateBeforeImport,
        stopOnError
      },
      progress: {
        uploadsProcessed: 0,
        totalUploads: uploadIds.length,
        currentPhase: 'validation',
        percentage: 0
      },
      results: {
        successful: [],
        failed: [],
        totalRowsProcessed: 0,
        totalRowsImported: 0
      },
      createdBy: 'system', // TODO: Get from auth context
      createdAt: new Date()
    };

    try {
      // Save job to database
      await this.saveBulkImportJob(job);

      job.status = 'processing';
      job.startedAt = new Date();
      await this.updateBulkImportJob(job);

      // Process each upload
      for (let i = 0; i < uploadIds.length; i++) {
        const uploadId = uploadIds[i];

        try {
          job.progress.currentUpload = uploadId;
          job.progress.currentPhase = validateBeforeImport ? 'validation' : 'import';
          job.progress.percentage = Math.round((i / uploadIds.length) * 100);

          if (onProgress) {
            onProgress(job.progress);
          }

          await this.updateBulkImportJob(job);

          // Get upload record
          const upload = await this.getUploadRecord(uploadId);
          if (!upload) {
            job.results.failed.push(uploadId);
            continue;
          }

          // Validate if required
          if (validateBeforeImport && upload.status !== 'validated') {
            job.results.failed.push(uploadId);
            continue;
          }

          // Execute import for this upload
          const importResult = await this.importSingleUpload(upload);

          job.results.successful.push(uploadId);
          job.results.totalRowsProcessed += importResult.rowsProcessed;
          job.results.totalRowsImported += importResult.rowsImported;
          job.progress.uploadsProcessed++;

        } catch (error) {
          console.error(`Failed to import upload ${uploadId}:`, error);
          job.results.failed.push(uploadId);

          if (stopOnError) {
            job.status = 'failed';
            break;
          }
        }
      }

      // Complete job
      if (job.status !== 'failed') {
        job.status = 'completed';
      }

      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - (job.startedAt?.getTime() || 0);
      job.progress.percentage = 100;

      await this.updateBulkImportJob(job);

      return job;

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      await this.updateBulkImportJob(job);
      throw error;
    }
  }

  /**
   * Import a single upload with transaction safety
   */
  private static async importSingleUpload(upload: PriceListUpload): Promise<ImportSummary> {
    return await this.withManagedTransaction(async (context) => {
      // Create a savepoint before processing
      const savepointName = `import_${upload.id}`;
      await this.createSavepoint(context.client, savepointName);

      try {
        let rowsProcessed = 0;
        let rowsImported = 0;
        let productsCreated = 0;
        let productsUpdated = 0;

        // Process each valid row
        for (const row of upload.previewData || []) {
          if (row.validationStatus === 'valid') {
            rowsProcessed++;

            try {
              // Check if product exists
              const existing = await context.client.query(
                'SELECT id FROM supplier_products WHERE supplier_id = $1 AND supplier_part_number = $2',
                [upload.supplierId, row.mappedData.supplierPartNumber]
              );

              if (existing.rows.length > 0) {
                // Update existing
                await this.updateSupplierProduct(context.client, existing.rows[0].id, row.mappedData);
                productsUpdated++;
              } else {
                // Create new
                await this.createSupplierProduct(context.client, row.mappedData, upload);
                productsCreated++;
              }

              rowsImported++;

            } catch (error) {
              console.error(`Failed to import row ${row.rowIndex}:`, error);
              // Continue with other rows unless critical error
            }
          }
        }

        // Update upload status
        await context.client.query(
          'UPDATE pricelist_uploads SET status = $1, imported_rows = $2 WHERE id = $3',
          ['imported', rowsImported, upload.id]
        );

        // Release savepoint on success
        await this.releaseSavepoint(context.client, savepointName);

        return {
          uploadId: upload.id,
          supplierId: upload.supplierId,
          fileName: upload.originalFileName,
          totalProcessingTime: 0, // Not tracking here
          rowsProcessed,
          rowsImported,
          rowsSkipped: (upload.previewData?.length || 0) - rowsProcessed,
          rowsFailed: 0,
          validationErrors: 0,
          validationWarnings: 0,
          productsCreated,
          productsUpdated,
          categoriesCreated: 0,
          totalValue: 0,
          averagePrice: 0,
          priceRange: { min: 0, max: 0 },
          dataQualityScore: 100,
          completenessScore: 100,
          recommendations: [],
          completedAt: new Date()
        };

      } catch (error) {
        // Rollback to savepoint on error
        await this.rollbackToSavepoint(context.client, savepointName);
        throw error;
      }
    });
  }

  /**
   * Helper database operations
   */
  private static async getUploadRecord(uploadId: string): Promise<PriceListUpload | null> {
    // Implementation would be similar to the one in the import route
    // This is a simplified version
    return null;
  }

  private static async saveBulkImportJob(job: BulkImportJob): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(`
        INSERT INTO bulk_import_jobs (
          id, upload_ids, status, batch_size, parallel_processing,
          validate_before_import, stop_on_error, uploads_processed,
          total_uploads, percentage, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        job.id,
        job.uploads,
        job.status,
        job.config.batchSize,
        job.config.parallelProcessing,
        job.config.validateBeforeImport,
        job.config.stopOnError,
        job.progress.uploadsProcessed,
        job.progress.totalUploads,
        job.progress.percentage,
        job.createdBy,
        job.createdAt
      ]);
    });
  }

  private static async updateBulkImportJob(job: BulkImportJob): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(`
        UPDATE bulk_import_jobs SET
          status = $2,
          uploads_processed = $3,
          current_upload_id = $4,
          current_phase = $5,
          percentage = $6,
          successful_uploads = $7,
          failed_uploads = $8,
          total_rows_processed = $9,
          total_rows_imported = $10,
          started_at = $11,
          completed_at = $12,
          duration = $13
        WHERE id = $1
      `, [
        job.id,
        job.status,
        job.progress.uploadsProcessed,
        job.progress.currentUpload,
        job.progress.currentPhase,
        job.progress.percentage,
        job.results.successful,
        job.results.failed,
        job.results.totalRowsProcessed,
        job.results.totalRowsImported,
        job.startedAt,
        job.completedAt,
        job.duration
      ]);
    });
  }

  private static async createSupplierProduct(client: PoolClient, data: any, upload: PriceListUpload): Promise<void> {
    // Implementation would create supplier product record
  }

  private static async updateSupplierProduct(client: PoolClient, productId: string, data: any): Promise<void> {
    // Implementation would update supplier product record
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.permits > 0) {
        this.permits--;
        this.executeOperation(operation, resolve, reject);
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          this.executeOperation(operation, resolve, reject);
        });
      }
    });
  }

  private async executeOperation<T>(
    operation: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (reason: any) => void
  ): Promise<void> {
    try {
      const result = await operation();
      this.release();
      resolve(result);
    } catch (error) {
      this.release();
      reject(error);
    }
  }

  private release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        next();
      }
    }
  }
}

/**
 * Progress tracking interface
 */
export interface BulkImportProgress {
  uploadsProcessed: number;
  totalUploads: number;
  currentUpload?: string;
  currentPhase: string;
  percentage: number;
}