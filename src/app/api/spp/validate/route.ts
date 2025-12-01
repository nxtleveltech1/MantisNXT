/**
 * POST /api/spp/validate - Validate a pricelist upload
 *
 * NEW: This endpoint now delegates to the V2 extraction system which uses
 * ExtractionJobQueue and ExtractionWorker for real extraction with progress tracking.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { query } from '@/lib/database';
import { extractionQueue } from '@/lib/services/ExtractionJobQueue';
import { ExtractionCache } from '@/lib/services/ExtractionCache';

const ValidateRequestSchema = z.object({
  upload_id: z.string().uuid(),
});

const extractionCache = new ExtractionCache();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { upload_id } = ValidateRequestSchema.parse(body);

    // Get upload metadata to determine supplier and configuration
    const uploadResult = await query<{ supplier_id: string }>(
      'SELECT supplier_id FROM spp.pricelist_upload WHERE upload_id = $1',
      [upload_id]
    );

    if (uploadResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Upload not found' }, { status: 404 });
    }

    const { supplier_id } = uploadResult.rows[0];

    const supplierOrgResult = await query<{
      org_id: string | null;
      organization_id: string | null;
    }>('SELECT org_id, organization_id FROM core.supplier WHERE supplier_id = $1', [supplier_id]);

    const orgRow = supplierOrgResult.rows[0];
    let org_id = orgRow?.org_id ?? orgRow?.organization_id ?? null;

    if (!org_id) {
      const fallbackOrg = await query<{ id: string }>(
        'SELECT id FROM organization ORDER BY created_at NULLS LAST LIMIT 1'
      );
      org_id = fallbackOrg.rows[0]?.id ?? null;

      if (org_id && supplierOrgResult.rows.length > 0) {
        await query(
          `UPDATE core.supplier
           SET org_id = COALESCE(org_id, $1),
               organization_id = COALESCE(organization_id, $1),
               updated_at = NOW()
           WHERE supplier_id = $2`,
          [org_id, supplier_id]
        );
      }
    }

    if (!org_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supplier organization not found',
          details: { supplier_id },
        },
        { status: 404 }
      );
    }

    // FK aligned to spp.pricelist_upload via migration 0211

    // Create extraction job
    const job_id = uuid();
    const extraction_config = {
      supplier_id,
      column_mapping: {}, // Auto-detect column mapping
      transformations: [],
      validation_mode: 'lenient', // Allow warnings
      currency_default: 'ZAR',
      auto_detect_columns: true,
    };

    await query(
      `INSERT INTO spp.extraction_jobs (job_id, upload_id, org_id, config, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [job_id, upload_id, org_id, JSON.stringify(extraction_config), 'queued']
    );

    // Enqueue extraction job (this will trigger ExtractionWorker.execute())
    await extractionQueue.enqueue(
      job_id,
      upload_id,
      extraction_config,
      org_id,
      0 // Normal priority
    );

    // Wait for extraction to complete (with timeout)
    const result = await waitForExtraction(job_id, 60000);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Extraction timeout - job is still processing. Please use /api/v2/pricelists/extract/' +
            job_id +
            ' to poll status.',
        },
        { status: 408 }
      );
    }

    // Convert extraction result to validation result format (backward compatibility)
    const validationResult = {
      upload_id,
      status:
        result.stats.invalid_products === 0
          ? 'valid'
          : result.stats.invalid_products > 0 && result.stats.valid_products > 0
            ? 'warning'
            : 'invalid',
      total_rows: result.stats.total_rows,
      valid_rows: result.stats.valid_products + result.stats.products_with_warnings,
      invalid_rows: result.stats.invalid_products,
      errors: result.products
        .filter(p => p.validation_status === 'invalid')
        .flatMap(p =>
          p.validation_issues.map(issue => ({
            row_num: p.row_number,
            field: issue.field,
            message: issue.message,
            value: issue.value,
          }))
        ),
      warnings: result.products
        .filter(p => p.validation_status === 'warning')
        .flatMap(p =>
          p.validation_issues
            .filter(issue => issue.severity === 'warning')
            .map(issue => ({
              row_num: p.row_number,
              type: issue.field,
              message: issue.message,
            }))
        ),
      summary: {
        new_products: result.stats.new_products,
        updated_prices: result.stats.existing_products,
        duplicate_skus: result.stats.duplicate_skus,
      },
    };

    // Store validation result reference
    await query(
      `UPDATE spp.pricelist_upload
       SET status = $1, validation_job_id = $2, updated_at = NOW()
       WHERE upload_id = $3`,
      [validationResult.status, job_id, upload_id]
    );

    return NextResponse.json({
      success: true,
      data: validationResult,
    });
  } catch (error) {
    console.error('Validation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Wait for extraction job to complete
 */
async function waitForExtraction(job_id: string, timeout: number = 60000) {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < timeout) {
    // Check cache for result
    const result = await extractionCache.get(job_id);
    if (result) {
      return result;
    }

    // Check job status
    const jobStatus = extractionQueue.getJobStatus(job_id);
    if (jobStatus?.status === 'failed') {
      throw new Error(jobStatus.error?.message || 'Extraction failed');
    }

    if (jobStatus?.status === 'cancelled') {
      throw new Error('Extraction was cancelled');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return null; // Timeout
}
