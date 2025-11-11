import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { withTransaction } from '@/lib/database';
import type { BulkImportProgress } from '@/lib/upload/transaction-manager';
import { TransactionManager } from '@/lib/upload/transaction-manager';
import { UploadErrorHandler } from '@/lib/upload/error-handler';
import type {
  BulkImportJob,
  PriceListUpload
} from '@/types/pricelist-upload';

/**
 * POST /api/suppliers/bulk-import - Create and execute bulk import job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      uploadIds,
      batchSize = 50,
      validateBeforeImport = true,
      stopOnError = false
    } = body;

    // Validation
    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      return UploadErrorHandler.createApiErrorResponse(
        new Error('Upload IDs array is required'),
        { operation: 'bulk_import_create' },
        400
      );
    }

    if (uploadIds.length > 100) {
      return UploadErrorHandler.createApiErrorResponse(
        new Error('Maximum 100 uploads allowed per bulk import job'),
        { operation: 'bulk_import_create' },
        400
      );
    }

    // Validate that all uploads exist and are ready for import
    const validationResults = await validateUploadsForBulkImport(uploadIds);
    if (!validationResults.valid) {
      return NextResponse.json({
        error: 'Some uploads are not ready for import',
        details: validationResults.errors
      }, { status: 400 });
    }

    // Create and execute bulk import job
    const job = await TransactionManager.executeBulkImport(uploadIds, {
      batchSize,
      validateBeforeImport,
      stopOnError,
      onProgress: (progress: BulkImportProgress) => {
        // In a real application, this would send progress updates via WebSocket
        // or server-sent events to the client
        console.log(`Bulk import progress: ${progress.percentage}% (${progress.uploadsProcessed}/${progress.totalUploads})`);
      }
    });

    return NextResponse.json({
      success: true,
      data: job,
      message: `Bulk import job created and ${job.status === 'completed' ? 'completed' : 'started'}`
    });

  } catch (error) {
    return UploadErrorHandler.createApiErrorResponse(
      error,
      { operation: 'bulk_import_create' }
    );
  }
}

/**
 * GET /api/suppliers/bulk-import - Get bulk import job status or history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    if (jobId) {
      // Get specific job status
      const job = await getBulkImportJob(jobId);
      if (!job) {
        return NextResponse.json(
          { error: 'Bulk import job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: job
      });
    } else {
      // Get job history
      const jobs = await getBulkImportHistory(limit, offset, status);
      return NextResponse.json({
        success: true,
        data: jobs
      });
    }

  } catch (error) {
    return UploadErrorHandler.createApiErrorResponse(
      error,
      { operation: 'bulk_import_get' }
    );
  }
}

/**
 * PUT /api/suppliers/bulk-import - Update or cancel bulk import job
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, action } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = await getBulkImportJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Bulk import job not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'cancel':
        if (!['pending', 'processing'].includes(job.status)) {
          return NextResponse.json(
            { error: 'Cannot cancel job that is not pending or processing' },
            { status: 400 }
          );
        }

        await cancelBulkImportJob(jobId);
        return NextResponse.json({
          success: true,
          message: 'Bulk import job cancelled successfully'
        });

      case 'retry': {
        if (job.status !== 'failed') {
          return NextResponse.json(
            { error: 'Can only retry failed jobs' },
            { status: 400 }
          );
        }

        // Create new job with failed uploads
        const retryJob = await TransactionManager.executeBulkImport(
          job.results.failed,
          job.config
        );

        return NextResponse.json({
          success: true,
          data: retryJob,
          message: 'Retry job created successfully'
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    return UploadErrorHandler.createApiErrorResponse(
      error,
      { operation: 'bulk_import_update' }
    );
  }
}

/**
 * DELETE /api/suppliers/bulk-import - Delete completed bulk import jobs
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30');

    if (jobId) {
      // Delete specific job
      const job = await getBulkImportJob(jobId);
      if (!job) {
        return NextResponse.json(
          { error: 'Bulk import job not found' },
          { status: 404 }
        );
      }

      if (['pending', 'processing'].includes(job.status)) {
        return NextResponse.json(
          { error: 'Cannot delete active job' },
          { status: 400 }
        );
      }

      await deleteBulkImportJob(jobId);
      return NextResponse.json({
        success: true,
        message: 'Bulk import job deleted successfully'
      });

    } else {
      // Delete old completed jobs
      const deletedCount = await deleteOldBulkImportJobs(olderThanDays);
      return NextResponse.json({
        success: true,
        data: { deletedCount },
        message: `Deleted ${deletedCount} old bulk import jobs`
      });
    }

  } catch (error) {
    return UploadErrorHandler.createApiErrorResponse(
      error,
      { operation: 'bulk_import_delete' }
    );
  }
}

/**
 * Validate uploads for bulk import
 */
async function validateUploadsForBulkImport(uploadIds: string[]): Promise<{
  valid: boolean;
  errors: string[];
  uploads: PriceListUpload[];
}> {
  const errors: string[] = [];
  const uploads: PriceListUpload[] = [];

  try {
    await withTransaction(async (client) => {
      for (const uploadId of uploadIds) {
        const result = await client.query(`
          SELECT id, supplier_id, supplier_name, original_file_name,
                 status, validation_status, total_rows, valid_rows
          FROM pricelist_uploads
          WHERE id = $1
        `, [uploadId]);

        if (result.rows.length === 0) {
          errors.push(`Upload ${uploadId} not found`);
          continue;
        }

        const upload = result.rows[0];

        // Check upload status
        if (upload.status === 'failed') {
          errors.push(`Upload ${uploadId} (${upload.original_file_name}) failed validation`);
          continue;
        }

        if (upload.status === 'imported') {
          errors.push(`Upload ${uploadId} (${upload.original_file_name}) already imported`);
          continue;
        }

        if (upload.status !== 'validated') {
          errors.push(`Upload ${uploadId} (${upload.original_file_name}) not validated yet`);
          continue;
        }

        if (upload.valid_rows === 0) {
          errors.push(`Upload ${uploadId} (${upload.original_file_name}) has no valid rows`);
          continue;
        }

        uploads.push({
          id: upload.id,
          supplierId: upload.supplier_id,
          supplierName: upload.supplier_name,
          originalFileName: upload.original_file_name,
          status: upload.status,
          validationStatus: upload.validation_status,
          totalRows: upload.total_rows,
          validRows: upload.valid_rows
        } as PriceListUpload);
      }
    });

  } catch (error) {
    errors.push(`Database validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    uploads
  };
}

/**
 * Get bulk import job by ID
 */
async function getBulkImportJob(jobId: string): Promise<BulkImportJob | null> {
  try {
    return await withTransaction(async (client) => {
      const result = await client.query(`
        SELECT * FROM bulk_import_jobs WHERE id = $1
      `, [jobId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        uploads: row.upload_ids,
        status: row.status,
        config: {
          batchSize: row.batch_size,
          parallelProcessing: row.parallel_processing,
          validateBeforeImport: row.validate_before_import,
          stopOnError: row.stop_on_error
        },
        progress: {
          uploadsProcessed: row.uploads_processed,
          totalUploads: row.total_uploads,
          currentUpload: row.current_upload_id,
          currentPhase: row.current_phase,
          percentage: row.percentage
        },
        results: {
          successful: row.successful_uploads,
          failed: row.failed_uploads,
          totalRowsProcessed: row.total_rows_processed,
          totalRowsImported: row.total_rows_imported
        },
        createdBy: row.created_by,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        duration: row.duration
      };
    });

  } catch (error) {
    await UploadErrorHandler.handleError(error, {
      operation: 'get_bulk_import_job',
      additionalData: { jobId }
    });
    return null;
  }
}

/**
 * Get bulk import job history
 */
async function getBulkImportHistory(
  limit: number,
  offset: number,
  status?: string | null
): Promise<BulkImportJob[]> {
  try {
    return await withTransaction(async (client) => {
      let whereClause = '';
      const params: Array<number | string> = [limit, offset];

      if (status) {
        whereClause = 'WHERE status = $3';
        params.push(status);
      }

      const result = await client.query(`
        SELECT
          id, upload_ids, status, batch_size, uploads_processed,
          total_uploads, percentage, successful_uploads, failed_uploads,
          total_rows_processed, total_rows_imported, created_by,
          created_at, started_at, completed_at, duration
        FROM bulk_import_jobs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, params);

      return result.rows.map(row => ({
        id: String(row.id),
        uploads: Array.isArray(row.upload_ids) ? row.upload_ids : [],
        status: row.status,
        config: {
          batchSize: Number(row.batch_size) || 0,
          parallelProcessing: true,
          validateBeforeImport: true,
          stopOnError: false
        },
        progress: {
          uploadsProcessed: Number(row.uploads_processed) || 0,
          totalUploads: Number(row.total_uploads) || 0,
          currentPhase: 'cleanup',
          percentage: Number(row.percentage) || 0
        },
        results: {
          successful: Array.isArray(row.successful_uploads) ? row.successful_uploads : [],
          failed: Array.isArray(row.failed_uploads) ? row.failed_uploads : [],
          totalRowsProcessed: Number(row.total_rows_processed) || 0,
          totalRowsImported: Number(row.total_rows_imported) || 0
        },
        createdBy: String(row.created_by),
        createdAt: row.created_at,
        startedAt: row.started_at ?? undefined,
        completedAt: row.completed_at ?? undefined,
        duration: row.duration ?? undefined
      } as BulkImportJob));
    });

  } catch (error) {
    await UploadErrorHandler.handleError(error, {
      operation: 'get_bulk_import_history'
    });
    return [];
  }
}

/**
 * Cancel bulk import job
 */
async function cancelBulkImportJob(jobId: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(`
      UPDATE bulk_import_jobs
      SET status = 'cancelled', completed_at = NOW()
      WHERE id = $1
    `, [jobId]);
  });
}

/**
 * Delete bulk import job
 */
async function deleteBulkImportJob(jobId: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM bulk_import_jobs WHERE id = $1', [jobId]);
  });
}

/**
 * Delete old bulk import jobs
 */
async function deleteOldBulkImportJobs(olderThanDays: number): Promise<number> {
  const result = await withTransaction(async (client) => {
    const deleteResult = await client.query(`
      DELETE FROM bulk_import_jobs
      WHERE status IN ('completed', 'failed', 'cancelled')
        AND created_at < NOW() - INTERVAL '${olderThanDays} days'
    `);
    return deleteResult.rowCount || 0;
  });

  return result;
}
