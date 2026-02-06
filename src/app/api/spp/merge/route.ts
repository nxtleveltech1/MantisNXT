/**
 * POST /api/spp/merge - Merge validated pricelist into CORE schema
 *
 * NEW: This endpoint now uses cached extraction results from ExtractionWorker
 * instead of re-processing the file.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query, withTransaction } from '@/lib/database';
import { ExtractionCache } from '@/lib/services/ExtractionCache';

const MergeRequestSchema = z.object({
  upload_id: z.string().uuid(),
  skip_invalid_rows: z.boolean().optional(),
});

const extractionCache = new ExtractionCache();

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const qpUploadId = url.searchParams.get('upload_id');
    const qpSkip = url.searchParams.get('skip_invalid_rows');
    let body: unknown = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn(
        'SPP merge: falling back to query params because body could not be parsed.',
        error
      );
    }
    const parsed = MergeRequestSchema.safeParse({
      upload_id: body?.upload_id || qpUploadId,
      skip_invalid_rows:
        typeof body?.skip_invalid_rows === 'boolean' ? body.skip_invalid_rows : qpSkip === 'true',
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { upload_id, skip_invalid_rows } = parsed.data;

    // Get validation job ID to retrieve cached extraction results
    const uploadResult = await query<{ validation_job_id: string; supplier_id: string }>(
      'SELECT validation_job_id, supplier_id FROM spp.pricelist_upload WHERE upload_id = $1',
      [upload_id]
    );

    if (uploadResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Upload not found' }, { status: 404 });
    }

    const { validation_job_id, supplier_id } = uploadResult.rows[0];

    if (!validation_job_id) {
      return NextResponse.json(
        { success: false, error: 'Upload has not been validated. Please run validation first.' },
        { status: 400 }
      );
    }

    // Get cached extraction results
    const extractionResult = await extractionCache.get(validation_job_id);

    if (!extractionResult) {
      return NextResponse.json(
        {
          success: false,
          error: 'Extraction results not found or expired. Please re-validate the upload.',
        },
        { status: 410 }
      );
    }

    // Filter products based on skip_invalid_rows option
    const productsToMerge = skip_invalid_rows
      ? extractionResult.products.filter(p => p.validation_status !== 'invalid')
      : extractionResult.products;

    // Perform merge in transaction
    const mergeResult = await withTransaction(async client => {
      let products_created = 0;
      let products_updated = 0;
      let prices_updated = 0;
      const errors: string[] = [];

      for (const product of productsToMerge) {
        try {
          // Check if product exists
          const existingProduct = await client.query(
            'SELECT supplier_product_id FROM core.supplier_product WHERE supplier_id = $1 AND supplier_sku = $2',
            [supplier_id, product.supplier_sku]
          );

          // Build attrs_json with extra fields that don't have dedicated columns
          const attrsJson: Record<string, unknown> = {};
          if (product.brand) attrsJson.brand = product.brand;
          if (product.category) attrsJson.category_raw = product.category;
          if (product.vat_code) attrsJson.vat_code = product.vat_code;
          if (product.min_order_qty) attrsJson.min_order_qty = product.min_order_qty;
          if (product.lead_time_days) attrsJson.lead_time_days = product.lead_time_days;
          // Preserve any attrs from the extraction (rsp, stock_qty, etc.)
          if (product.attrs_json) Object.assign(attrsJson, product.attrs_json);

          if (existingProduct.rows.length > 0) {
            // Update existing product
            const supplier_product_id = existingProduct.rows[0].supplier_product_id;

            await client.query(
              `UPDATE core.supplier_product
               SET name_from_supplier = $1, uom = $2, pack_size = $3,
                   barcode = $4, last_seen_at = NOW(),
                   is_active = true, attrs_json = COALESCE(attrs_json, '{}'::jsonb) || $5::jsonb,
                   updated_at = NOW()
               WHERE supplier_product_id = $6`,
              [
                product.name,
                product.uom,
                product.pack_size,
                product.barcode,
                JSON.stringify(attrsJson),
                supplier_product_id,
              ]
            );

            products_updated++;

            // Close previous current price
            await client.query(
              `UPDATE core.price_history
               SET is_current = false, valid_to = NOW()
               WHERE supplier_product_id = $1 AND is_current = true`,
              [supplier_product_id]
            );

            // Insert new price history
            await client.query(
              `INSERT INTO core.price_history (
                supplier_product_id, price, currency, valid_from, is_current, change_reason
              ) VALUES ($1, $2, $3, NOW(), true, 'pricelist_upload')`,
              [supplier_product_id, product.price, product.currency]
            );

            prices_updated++;
          } else {
            // Create new product
            const newProduct = await client.query(
              `INSERT INTO core.supplier_product (
                supplier_id, supplier_sku, name_from_supplier, uom, pack_size,
                barcode, first_seen_at, last_seen_at, is_active, is_new, attrs_json
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), true, true, $7::jsonb)
              RETURNING supplier_product_id`,
              [
                supplier_id,
                product.supplier_sku,
                product.name,
                product.uom,
                product.pack_size,
                product.barcode,
                JSON.stringify(attrsJson),
              ]
            );

            products_created++;

            // Insert initial price
            await client.query(
              `INSERT INTO core.price_history (
                supplier_product_id, price, currency, valid_from, is_current, change_reason
              ) VALUES ($1, $2, $3, NOW(), true, 'initial_import')`,
              [newProduct.rows[0].supplier_product_id, product.price, product.currency]
            );

            prices_updated++;
          }
        } catch (error: any) {
          errors.push(`Row ${product.row_number}: ${error.message}`);
          if (errors.length > 100) break; // Limit error collection
        }
      }

      // Update upload status
      await client.query(
        'UPDATE spp.pricelist_upload SET status = $1, updated_at = NOW() WHERE upload_id = $2',
        ['merged', upload_id]
      );

      return {
        success: errors.length === 0,
        products_created,
        products_updated,
        prices_updated,
        total_processed: productsToMerge.length,
        errors,
      };
    });

    return NextResponse.json({
      success: true,
      data: mergeResult,
    });
  } catch (error) {
    console.error('Merge error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Merge failed',
      },
      { status: 500 }
    );
  }
}
