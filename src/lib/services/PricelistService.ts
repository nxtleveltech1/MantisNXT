/**
 * PricelistService - Handles pricelist upload, validation, and merging
 *
 * Responsibilities:
 * - Upload pricelist files to SPP schema
 * - Validate pricelist data against business rules
 * - Merge validated pricelists into CORE schema
 * - Track upload status and history
 */

import { query as dbQuery, withTransaction } from '../../../lib/database/unified-connection';
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags';
import type {
  PricelistUpload,
  PricelistRow,
  PricelistUploadRequest,
  PricelistValidationResult,
  MergeResult,
  MergeProcedureResult,
  ValidationError} from '../../types/nxt-spp';
import {
  PricelistUploadSchema,
  MergeProcedureResultSchema
} from '../../types/nxt-spp';

export class PricelistService {
  /**
   * Create a new pricelist upload record
   */
  async createUpload(request: PricelistUploadRequest): Promise<PricelistUpload> {
    // Validate request
    const validated = PricelistUploadSchema.parse({
      supplier_id: request.supplier_id,
      filename: request.filename,
      currency: request.currency || 'ZAR',
      valid_from: request.valid_from || new Date(),
      valid_to: request.valid_to
    });

    const query = `
      INSERT INTO spp.pricelist_upload (
        supplier_id, filename, currency, valid_from, valid_to, status
      )
      VALUES ($1, $2, $3, $4, $5, 'received')
      RETURNING upload_id, supplier_id, received_at, filename, currency, valid_from, valid_to, row_count, status, errors_json, processed_by, processed_at, created_at, updated_at
    `;

    const values = [
      validated.supplier_id,
      validated.filename,
      validated.currency,
      validated.valid_from,
      validated.valid_to
    ];

    const result = await dbQuery<PricelistUpload>(query, values);

    if (!result || !result.rows || result.rows.length === 0) {
      console.error('❌ [PricelistService.createUpload] No rows returned from INSERT:', {
        query,
        values,
        result
      });
      throw new Error('Failed to create upload record - no rows returned');
    }

    // Normalize the first returned row and ensure upload_id exists
    const first = result.rows[0] as unknown;
    let normalizedUploadId = first?.upload_id ?? first?.uploadId ?? first?.['upload_id'];

    if (!normalizedUploadId) {
      // Fallback: fetch upload_id explicitly
      console.warn('⚠️ [PricelistService.createUpload] Missing upload_id in RETURNING; falling back to SELECT');
      const fallback = await dbQuery<{ upload_id: string }>(
        'SELECT upload_id FROM spp.pricelist_upload WHERE supplier_id = $1 AND filename = $2 ORDER BY received_at DESC LIMIT 1',
        [validated.supplier_id, validated.filename]
      );
      normalizedUploadId = fallback.rows?.[0]?.upload_id;
    }

    if (!normalizedUploadId) {
      console.error('❌ [PricelistService.createUpload] Upload record structure:', {
        row0: first,
        keys: first ? Object.keys(first) : [],
        fullResult: result
      });
      throw new Error('Upload record created but missing upload_id field');
    }

    const upload = { ...first, upload_id: normalizedUploadId } as PricelistUpload;
    return upload;
  }

  /**
   * Insert pricelist rows in batch
   */
  async insertRows(uploadId: string, rows: PricelistRow[]): Promise<number> {
    return await withTransaction(async (client: unknown) => {
      let insertedCount = 0;

      // Batch insert for performance (100 rows at a time)
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        const values: unknown[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        batch.forEach((row, idx) => {
          const rowNum = i + idx + 1;
          placeholders.push(
            `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
            `$${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
            `$${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
          );
          values.push(
            uploadId,
            rowNum,
            row.supplier_sku,
            row.name,
            row.brand || null,
            row.uom,
            row.pack_size || null,
            row.price,
            row.currency,
            row.category_raw || null,
            row.vat_code || null,
            row.barcode || null,
            (row as unknown).attrs_json || null
          );
        });

        const query = `
          INSERT INTO spp.pricelist_row (
            upload_id, row_num, supplier_sku, name, brand, uom, pack_size,
            price, currency, category_raw, vat_code, barcode, attrs_json
          ) VALUES ${placeholders.join(', ')}
        `;

        const result = await client.query(query, values);
        insertedCount += result.rowCount || 0;
      }

      // Update upload row count
      await client.query(
        'UPDATE spp.pricelist_upload SET row_count = $1 WHERE upload_id = $2',
        [insertedCount, uploadId]
      );

      return insertedCount;
    });
  }

  /**
   * Validate pricelist data
   */
  async validateUpload(uploadId: string): Promise<PricelistValidationResult> {
    await this.updateUploadStatus(uploadId, 'validating');

    const errors: ValidationError[] = [];
    const warnings: Array<{ row_num: number; type: string; message: string }> = [];

    try {
      // Get upload metadata
      const upload = await this.getUploadById(uploadId);
      if (!upload) {
        throw new Error(`Upload ${uploadId} not found`);
      }

      // Validate required fields
      const missingFieldsQuery = `
        SELECT row_num, supplier_sku, name, uom, price, currency
        FROM spp.pricelist_row
        WHERE upload_id = $1
        AND (
          supplier_sku IS NULL OR supplier_sku = '' OR
          name IS NULL OR name = '' OR
          uom IS NULL OR uom = '' OR
          price IS NULL OR price <= 0 OR
          currency IS NULL OR currency = ''
        )
      `;
      const missingFields = await dbQuery(missingFieldsQuery, [uploadId]);

      missingFields.rows.forEach(row => {
        if (!row.supplier_sku) {
          errors.push({
            row_num: row.row_num,
            field: 'supplier_sku',
            value: null,
            message: 'Supplier SKU is required',
            severity: 'error'
          });
        }
        if (!row.name) {
          errors.push({
            row_num: row.row_num,
            field: 'name',
            value: null,
            message: 'Product name is required',
            severity: 'error'
          });
        }
        if (!row.price || row.price <= 0) {
          errors.push({
            row_num: row.row_num,
            field: 'price',
            value: row.price,
            message: 'Price must be positive',
            severity: 'error'
          });
        }
      });

      // Check for duplicate SKUs within upload
      const duplicatesQuery = `
        SELECT supplier_sku, COUNT(*) as count
        FROM spp.pricelist_row
        WHERE upload_id = $1
        GROUP BY supplier_sku
        HAVING COUNT(*) > 1
      `;
      const duplicates = await dbQuery(duplicatesQuery, [uploadId]);

      duplicates.rows.forEach(dup => {
        warnings.push({
          row_num: 0,
          type: 'duplicate_sku',
          message: `Duplicate SKU '${dup.supplier_sku}' found ${dup.count} times`
        });
      });

      // Get summary statistics
      const summaryQuery = `
        SELECT
          COUNT(*) as total_rows,
          COUNT(CASE WHEN category_raw IS NULL THEN 1 END) as unmapped_categories,
          COUNT(DISTINCT supplier_sku) as unique_skus
        FROM spp.pricelist_row
        WHERE upload_id = $1
      `;
      const summary = await dbQuery(summaryQuery, [uploadId]);
      const stats = summary.rows[0];

      // Check for new products vs updates
      const newProductsQuery = `
        SELECT COUNT(*) as new_count
        FROM spp.pricelist_row r
        WHERE r.upload_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM core.supplier_product sp
          WHERE sp.supplier_id = $2
          AND sp.supplier_sku = r.supplier_sku
        )
      `;
      const newProducts = await dbQuery(newProductsQuery, [uploadId, upload.supplier_id]);

      // Determine validation status
      const status = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';

      const result: PricelistValidationResult = {
        upload_id: uploadId,
        status,
        total_rows: parseInt(stats.total_rows),
        valid_rows: parseInt(stats.total_rows) - errors.length,
        invalid_rows: errors.length,
        warnings,
        errors: errors.map(e => ({
          row_num: e.row_num,
          field: e.field,
          message: e.message
        })),
        summary: {
          new_products: parseInt(newProducts.rows[0].new_count),
          updated_prices: parseInt(stats.total_rows) - parseInt(newProducts.rows[0].new_count),
          discontinued_products: 0,
          unmapped_categories: parseInt(stats.unmapped_categories)
        }
      };

      // Update upload status and errors
      const updateStatus = status === 'invalid' ? 'failed' : 'validated';
      await this.updateUploadStatus(uploadId, updateStatus, {
        validation_result: result,
        errors: errors.length > 0 ? errors : null
      });

      return result;
    } catch (error) {
      await this.updateUploadStatus(uploadId, 'failed', {
        error: error instanceof Error ? error.message : 'Validation failed'
      });
      throw error;
    }
  }

  /**
   * Merge validated pricelist into CORE schema
   *
   * Uses stored procedure if USE_MERGE_STORED_PROCEDURE feature flag is enabled,
   * otherwise falls back to inline SQL transaction logic.
   *
   * @param uploadId - UUID of the validated pricelist upload
   * @returns MergeResult with success status, metrics, and any errors
   * @throws Error if upload not found or not in validated status
   */
  async mergePricelist(uploadId: string, options?: { skipInvalidRows?: boolean }): Promise<MergeResult> {
    const startTime = Date.now();

    try {
      // Get upload metadata
      const upload = await this.getUploadById(uploadId);
      if (!upload) {
        throw new Error(`Upload ${uploadId} not found`);
      }

      if (upload.status !== 'validated' && !options?.skipInvalidRows) {
        throw new Error(`Upload must be validated before merging. Current status: ${upload.status}`);
      }

      // Check if stored procedure is available via feature flag
      if (isFeatureEnabled(FeatureFlag.USE_MERGE_STORED_PROCEDURE) && !options?.skipInvalidRows) {
        return await this.mergeWithStoredProcedure(uploadId, startTime);
      } else {
        return await this.mergeWithInlineSQL(uploadId, upload, startTime, options?.skipInvalidRows === true);
      }
    } catch (error) {
      await this.updateUploadStatus(uploadId, 'failed', {
        error: error instanceof Error ? error.message : 'Merge failed'
      });

      return {
        success: false,
        upload_id: uploadId,
        products_created: 0,
        products_updated: 0,
        prices_updated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Merge pricelist using stored procedure (Phase 1 implementation)
   *
   * Calls spp.merge_pricelist() stored procedure which handles all merge logic
   * in a single atomic database operation.
   *
   * @private
   */
  private async mergeWithStoredProcedure(
    uploadId: string,
    startTime: number
  ): Promise<MergeResult> {
    try {
      // Call stored procedure - it returns MergeProcedureResult
      const result = await dbQuery<MergeProcedureResult>(
        'SELECT * FROM spp.merge_pricelist($1)',
        [uploadId]
      );

      const procResult = result.rows[0];

      // Validate result with Zod schema
      const validated = MergeProcedureResultSchema.parse(procResult);

      // Convert to MergeResult format
      return {
        success: validated.success,
        upload_id: uploadId,
        products_created: validated.products_created,
        products_updated: validated.products_updated,
        prices_updated: validated.prices_updated,
        errors: validated.errors,
        duration_ms: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(
        `Stored procedure merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Merge pricelist using inline SQL (Phase 2 fallback implementation)
   *
   * Executes merge logic via inline SQL transaction with manual step-by-step operations.
   * This is the fallback when stored procedure is not yet available.
   *
   * @private
   */
  private async mergeWithInlineSQL(
    uploadId: string,
    upload: PricelistUpload,
    startTime: number,
    filterValidOnly: boolean = false
  ): Promise<MergeResult> {
    let productsCreated = 0;
    let productsUpdated = 0;
    let pricesUpdated = 0;
    const errors: string[] = [];

    await withTransaction(async (client) => {
      // Detect optional brand_from_supplier column for compatibility
      let hasBrandColumn = true
      try {
        const brandCheck = await client.query(
          "SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='supplier_product' AND column_name='brand_from_supplier' LIMIT 1"
        )
        hasBrandColumn = (brandCheck.rowCount || 0) > 0
      } catch {
        hasBrandColumn = false
      }
      const validRowCondition = `(
        r.supplier_sku IS NOT NULL AND r.supplier_sku <> '' AND
        r.name IS NOT NULL AND r.name <> '' AND
        r.uom IS NOT NULL AND r.uom <> '' AND
        r.price IS NOT NULL AND r.price > 0 AND
        r.currency IS NOT NULL AND r.currency <> ''
      )`;
      // Step 1: Upsert supplier products
      const upsertColumns = hasBrandColumn
        ? `supplier_id, supplier_sku, name_from_supplier, brand_from_supplier, uom, pack_size, barcode, is_new, is_active, first_seen_at, last_seen_at`
        : `supplier_id, supplier_sku, name_from_supplier, uom, pack_size, barcode, is_new, is_active, first_seen_at, last_seen_at`

      const upsertSelect = hasBrandColumn
        ? `
          $1::uuid as supplier_id,
          r.supplier_sku,
          r.name,
          r.brand,
          r.uom,
          r.pack_size,
          r.barcode,
          true as is_new,
          true as is_active,
          NOW() as first_seen_at,
          NOW() as last_seen_at
        `
        : `
          $1::uuid as supplier_id,
          r.supplier_sku,
          r.name,
          r.uom,
          r.pack_size,
          r.barcode,
          true as is_new,
          true as is_active,
          NOW() as first_seen_at,
          NOW() as last_seen_at
        `

      const upsertBrandUpdate = hasBrandColumn
        ? `, brand_from_supplier = COALESCE(EXCLUDED.brand_from_supplier, core.supplier_product.brand_from_supplier)`
        : ''

      const upsertQuery = `
        INSERT INTO core.supplier_product (
          ${upsertColumns}
        )
        SELECT DISTINCT
          ${upsertSelect}
        FROM spp.pricelist_row r
        WHERE r.upload_id = $2
        ${filterValidOnly ? `AND ${validRowCondition}` : ''}
        ON CONFLICT (supplier_id, supplier_sku) DO UPDATE
        SET
          name_from_supplier = EXCLUDED.name_from_supplier
          ${upsertBrandUpdate},
          uom = EXCLUDED.uom,
          pack_size = EXCLUDED.pack_size,
          barcode = EXCLUDED.barcode,
          last_seen_at = NOW(),
          is_active = true,
          updated_at = NOW()
        RETURNING supplier_product_id,
          (xmax = 0) AS is_insert
      `;

      const upsertResult = await client.query(upsertQuery, [upload.supplier_id, uploadId]);

      // Count inserts vs updates
      upsertResult.rows.forEach(row => {
        if (row.is_insert) {
          productsCreated++;
        } else {
          productsUpdated++;
        }
      });

      // Step 2: Close current price history where price changed
      const closePricesQuery = `
        UPDATE core.price_history ph
        SET valid_to = $3, is_current = false
        FROM (
          SELECT DISTINCT ON (sp.supplier_product_id)
            sp.supplier_product_id,
            r.price,
            r.currency
          FROM spp.pricelist_row r
          JOIN core.supplier_product sp
            ON sp.supplier_id = $1 AND sp.supplier_sku = r.supplier_sku
          WHERE r.upload_id = $2
          ${filterValidOnly ? `AND ${validRowCondition}` : ''}
        ) new_prices
        WHERE ph.supplier_product_id = new_prices.supplier_product_id
          AND ph.is_current = true
          AND (ph.price, ph.currency) IS DISTINCT FROM (new_prices.price, new_prices.currency)
      `;

      await client.query(closePricesQuery, [
        upload.supplier_id,
        uploadId,
        upload.valid_from
      ]);

      // Step 3: Insert new price history records
      const insertPricesQuery = `
        INSERT INTO core.price_history (
          supplier_product_id, price, currency, valid_from, is_current
        )
        SELECT DISTINCT ON (sp.supplier_product_id)
          sp.supplier_product_id,
          r.price,
          r.currency,
          $3 as valid_from,
          true as is_current
        FROM spp.pricelist_row r
        JOIN core.supplier_product sp
          ON sp.supplier_id = $1 AND sp.supplier_sku = r.supplier_sku
        WHERE r.upload_id = $2
        ${filterValidOnly ? `AND ${validRowCondition}` : ''}
        ON CONFLICT (supplier_product_id, valid_from) WHERE (is_current = true)
        DO UPDATE SET
          price = EXCLUDED.price,
          currency = EXCLUDED.currency
        RETURNING price_history_id
      `;

      const priceResult = await client.query(insertPricesQuery, [
        upload.supplier_id,
        uploadId,
        upload.valid_from
      ]);

      pricesUpdated = priceResult.rowCount || 0;

      // Update upload status
      await client.query(
        'UPDATE spp.pricelist_upload SET status = $1, processed_at = NOW() WHERE upload_id = $2',
        ['merged', uploadId]
      );
    });

    return {
      success: true,
      upload_id: uploadId,
      products_created: productsCreated,
      products_updated: productsUpdated,
      prices_updated: pricesUpdated,
      errors,
      duration_ms: Date.now() - startTime
    };
  }

  /**
   * Get upload by ID
   */
  async getUploadById(uploadId: string): Promise<PricelistUpload | null> {
    const query = 'SELECT * FROM spp.pricelist_upload WHERE upload_id = $1';
    const result = await dbQuery<PricelistUpload>(query, [uploadId]);
    return result.rows[0] || null;
  }

  /**
   * List uploads with advanced filtering
   */
  async listUploads(filters?: {
    supplier_id?: string;
    status?: PricelistUpload['status'][];
    search?: string;
    from_date?: Date;
    to_date?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ uploads: PricelistUpload[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.supplier_id) {
      conditions.push(`supplier_id = $${paramIndex++}`);
      params.push(filters.supplier_id);
    }

    if (filters?.status && filters.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex++}::text[])`);
      params.push(filters.status);
    }

    if (filters?.search) {
      conditions.push(`filename ILIKE $${paramIndex++}`);
      params.push(`%${filters.search}%`);
    }

    if (filters?.from_date) {
      conditions.push(`received_at >= $${paramIndex++}`);
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      conditions.push(`received_at <= $${paramIndex++}`);
      params.push(filters.to_date);
    }

    const whereClause = conditions.join(' AND ');
    const whereSql = whereClause ? `WHERE ${whereClause}` : '';
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM spp.pricelist_upload ${whereSql}`;
    const countResult = await dbQuery<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows?.[0]?.total ?? '0');

    // Get paginated results
    const query = `
      SELECT * FROM spp.pricelist_upload
      ${whereSql}
      ORDER BY received_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    params.push(limit, offset);

    const result = await dbQuery<PricelistUpload>(query, params);

    return {
      uploads: result.rows,
      total
    };
  }

  /**
   * Get upload details with all rows
   */
  async getUploadDetails(uploadId: string): Promise<{
    upload: PricelistUpload;
    rows: PricelistRow[];
    row_count: number;
  } | null> {
    const upload = await this.getUploadById(uploadId);
    if (!upload) {
      return null;
    }

    const rowsQuery = `
      SELECT * FROM spp.pricelist_row
      WHERE upload_id = $1
      ORDER BY row_num
    `;
    const rowsResult = await dbQuery<PricelistRow>(rowsQuery, [uploadId]);

    return {
      upload,
      rows: rowsResult.rows,
      row_count: rowsResult.rowCount || 0
    };
  }

  /**
   * Get dashboard metrics for SPP system
   */
  async getDashboardMetrics(): Promise<{
    total_suppliers: number;
    total_products: number;
    selected_products: number;
    selected_inventory_value: number;
    new_products_count: number;
    recent_price_changes_count: number;
  }> {
    try {
      const metricsQueries = await Promise.all([
        // Total suppliers with uploads
        dbQuery<{ count: string }>(
          'SELECT COUNT(DISTINCT supplier_id) as count FROM spp.pricelist_upload'
        ),

        // Total products in core catalog
        dbQuery<{ count: string }>(
          'SELECT COUNT(*) as count FROM core.supplier_product WHERE is_active = true'
        ),

        // Selected products in active selection
        dbQuery<{ count: string }>(
          `SELECT COUNT(DISTINCT isi.supplier_product_id) as count
           FROM core.inventory_selection s
           JOIN core.inventory_selected_item isi ON isi.selection_id = s.selection_id
           WHERE s.status = 'active' AND isi.status = 'selected'`
        ),

        // Selected inventory value - calculate from price history and stock on hand
        dbQuery<{ total: string }>(
          `SELECT COALESCE(SUM(ph.price * soh.qty), 0) as total
           FROM core.inventory_selection s
           JOIN core.inventory_selected_item isi ON isi.selection_id = s.selection_id
           JOIN core.price_history ph ON ph.supplier_product_id = isi.supplier_product_id AND ph.is_current = true
           LEFT JOIN core.stock_on_hand soh ON soh.supplier_product_id = isi.supplier_product_id
           WHERE s.status = 'active' AND isi.status = 'selected'`
        ),

        // New products count (last 30 days)
        dbQuery<{ count: string }>(
          `SELECT COUNT(*) as count
           FROM core.supplier_product
           WHERE created_at >= NOW() - INTERVAL '30 days' AND is_active = true`
        ),

        // Recent price changes (last 7 days)
        dbQuery<{ count: string }>(
          `SELECT COUNT(*) as count
           FROM core.price_history
           WHERE created_at >= NOW() - INTERVAL '7 days'`
        )
      ]);

      return {
        total_suppliers: parseInt(metricsQueries[0].rows[0]?.count || '0'),
        total_products: parseInt(metricsQueries[1].rows[0]?.count || '0'),
        selected_products: parseInt(metricsQueries[2].rows[0]?.count || '0'),
        selected_inventory_value: parseFloat(metricsQueries[3].rows[0]?.total || '0'),
        new_products_count: parseInt(metricsQueries[4].rows[0]?.count || '0'),
        recent_price_changes_count: parseInt(metricsQueries[5].rows[0]?.count || '0')
      };
    } catch (error) {
      console.error('[PricelistService] getDashboardMetrics error:', error);
      // Return safe defaults instead of crashing
      return {
        total_suppliers: 0,
        total_products: 0,
        selected_products: 0,
        selected_inventory_value: 0,
        new_products_count: 0,
        recent_price_changes_count: 0
      };
    }
  }

  /**
   * Reprocess a failed upload
   */
  async reprocessUpload(uploadId: string): Promise<PricelistValidationResult> {
    // Reset status to received
    await this.updateUploadStatus(uploadId, 'received', {
      reprocessed_at: new Date().toISOString()
    });

    // Re-validate
    return await this.validateUpload(uploadId);
  }

  /**
   * Update upload status
   */
  private async updateUploadStatus(
    uploadId: string,
    status: PricelistUpload['status'],
    errorsJson?: Record<string, unknown>
  ): Promise<void> {
    const query = `
      UPDATE spp.pricelist_upload
      SET status = $1, errors_json = $2, updated_at = NOW()
      WHERE upload_id = $3
    `;
    await dbQuery(query, [status, errorsJson ? JSON.stringify(errorsJson) : null, uploadId]);
  }
}

// Export singleton instance
export const pricelistService = new PricelistService();
