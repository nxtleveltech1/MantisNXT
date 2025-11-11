/**
 * SupplierProductService - Manages supplier product catalog
 *
 * Responsibilities:
 * - CRUD operations for supplier products
 * - Product mapping to internal catalog
 * - Category assignment
 * - Search and filtering
 */

import { query as dbQuery, withTransaction } from '../../../lib/database/unified-connection';
import type { SupplierProduct, ProductTableBySupplier, BulkOperationResult } from '../../types/nxt-spp';

export class SupplierProductService {
  /**
   * Get supplier product by ID
   */
  async getById(supplierProductId: string): Promise<SupplierProduct | null> {
    const query = 'SELECT * FROM core.supplier_product WHERE supplier_product_id = $1';
    const result = await dbQuery<SupplierProduct>(query, [supplierProductId]);
    return result.rows[0] || null;
  }

  /**
   * List supplier products with filters
   */
  async list(filters: {
    supplier_id?: string;
    is_new?: boolean;
    is_active?: boolean;
    is_mapped?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ products: SupplierProduct[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.supplier_id) {
      conditions.push(`supplier_id = $${paramIndex++}`);
      params.push(filters.supplier_id);
    }

    if (filters.is_new !== undefined) {
      conditions.push(`is_new = $${paramIndex++}`);
      params.push(filters.is_new);
    }

    if (filters.is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(filters.is_active);
    }

    if (filters.is_mapped !== undefined) {
      const condition = filters.is_mapped ? `product_id IS NOT NULL` : `product_id IS NULL`;
      conditions.push(condition);
    }

    if (filters.search) {
      conditions.push(
        `(name_from_supplier ILIKE $${paramIndex} OR supplier_sku ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM core.supplier_product WHERE ${whereClause}`;
    const countResult = await dbQuery<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT * FROM core.supplier_product
      WHERE ${whereClause}
      ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    params.push(limit, offset);

    const result = await dbQuery<SupplierProduct>(query, params);

    return {
      products: result.rows,
      total,
    };
  }

  /**
   * Get product table view for a supplier (for selection UI)
   */
  async getProductTable(
    supplierId: string,
    options?: {
      include_inactive?: boolean;
      include_unmapped?: boolean;
      category_id?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ products: ProductTableBySupplier[]; total: number }> {
    const conditions: string[] = ['sp.supplier_id = $1'];
    const params: unknown[] = [supplierId];
    let paramIndex = 2;

    if (!options?.include_inactive) {
      conditions.push('sp.is_active = true');
    }

    if (options?.category_id) {
      conditions.push(`sp.category_id = $${paramIndex++}`);
      params.push(options.category_id);
    }

    if (options?.search) {
      conditions.push(
        `(sp.name_from_supplier ILIKE $${paramIndex} OR sp.supplier_sku ILIKE $${paramIndex})`
      );
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    let query = `
      WITH current_prices AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          price,
          currency,
          valid_from
        FROM core.price_history
        WHERE is_current = true
        ORDER BY supplier_product_id, valid_from DESC
      ),
      previous_prices AS (
        SELECT DISTINCT ON (ph.supplier_product_id)
          ph.supplier_product_id,
          ph.price as previous_price
        FROM core.price_history ph
        JOIN current_prices cp ON cp.supplier_product_id = ph.supplier_product_id
        WHERE ph.is_current = false
          AND ph.valid_to < cp.valid_from
        ORDER BY ph.supplier_product_id, ph.valid_to DESC
      )
      SELECT
        s.supplier_id,
        s.name as supplier_name,
        sp.supplier_product_id,
        sp.supplier_sku,
        sp.name_from_supplier,
        sp.uom,
        sp.pack_size,
        br.brand,
        sp.category_id,
        COALESCE(c.name, cat.category_raw) as category_name,
        COALESCE(cp.price, pp.previous_price, 0) as current_price,
        pp.previous_price,
        CASE
          WHEN pp.previous_price IS NOT NULL AND pp.previous_price > 0
          THEN ROUND(((cp.price - pp.previous_price) / pp.previous_price * 100)::numeric, 2)
          ELSE NULL
        END as price_change_pct,
        cp.currency,
        sp.is_new,
        (sp.product_id IS NOT NULL) as is_mapped,
        EXISTS(
          SELECT 1 FROM core.inventory_selected_item isi
          JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id
          WHERE isi.supplier_product_id = sp.supplier_product_id
            AND sel.status = 'active'
            AND isi.status = 'selected'
        ) as is_selected,
        sp.first_seen_at,
        sp.last_seen_at,
        p.product_id as internal_product_id,
        p.name as internal_product_name
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      LEFT JOIN previous_prices pp ON pp.supplier_product_id = sp.supplier_product_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      LEFT JOIN core.product p ON p.product_id = sp.product_id
      LEFT JOIN LATERAL (
        SELECT r.brand
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
        WHERE r.supplier_sku = sp.supplier_sku AND r.brand IS NOT NULL AND r.brand <> ''
        ORDER BY u.received_at DESC, r.row_num DESC
        LIMIT 1
      ) br ON TRUE
      LEFT JOIN LATERAL (
        SELECT r.category_raw
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
        WHERE r.supplier_sku = sp.supplier_sku AND r.category_raw IS NOT NULL AND r.category_raw <> ''
        ORDER BY u.received_at DESC, r.row_num DESC
        LIMIT 1
      ) cat ON TRUE
      WHERE ${conditions.join(' AND ')}
    `;

    // Get total count (using same conditions but without pagination)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM core.supplier_product sp
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await dbQuery<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Apply pagination and ordering
    query += ` ORDER BY sp.is_new DESC, sp.last_seen_at DESC NULLS LAST`;
    
    if (options?.limit !== undefined && options.limit > 0) {
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(options.limit, options.offset || 0);
    }

    const result = await dbQuery<ProductTableBySupplier>(query, params);
    return { products: result.rows, total };
  }

  /**
   * Map supplier product to internal product
   */
  async mapToProduct(supplierProductId: string, productId: string): Promise<SupplierProduct> {
    const query = `
      UPDATE core.supplier_product
      SET product_id = $1, updated_at = NOW()
      WHERE supplier_product_id = $2
      RETURNING *
    `;

    const result = await dbQuery<SupplierProduct>(query, [productId, supplierProductId]);

    if (result.rowCount === 0) {
      throw new Error(`Supplier product ${supplierProductId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Bulk map products
   */
  async bulkMapProducts(
    mappings: Array<{
      supplier_product_id: string;
      product_id: string;
    }>
  ): Promise<BulkOperationResult<SupplierProduct>> {
    const results: SupplierProduct[] = [];
    const errors: Array<{ item: unknown; error: string }> = [];
    let processed = 0;
    let failed = 0;

    await withTransaction(async client => {
      for (const mapping of mappings) {
        try {
          const query = `
            UPDATE core.supplier_product
            SET product_id = $1, updated_at = NOW()
            WHERE supplier_product_id = $2
            RETURNING *
          `;

          const result = await client.query(query, [
            mapping.product_id,
            mapping.supplier_product_id,
          ]);

          if (result.rowCount && result.rowCount > 0) {
            results.push(result.rows[0]);
            processed++;
          } else {
            throw new Error('Product not found');
          }
        } catch (error) {
          failed++;
          errors.push({
            item: mapping,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    return {
      success: failed === 0,
      processed,
      failed,
      results,
      errors,
    };
  }

  /**
   * Assign category to supplier product
   */
  async assignCategory(supplierProductId: string, categoryId: string): Promise<SupplierProduct> {
    const query = `
      UPDATE core.supplier_product
      SET category_id = $1, updated_at = NOW()
      WHERE supplier_product_id = $2
      RETURNING *
    `;

    const result = await dbQuery<SupplierProduct>(query, [categoryId, supplierProductId]);

    if (result.rowCount === 0) {
      throw new Error(`Supplier product ${supplierProductId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Mark products as discontinued (not seen in recent uploads)
   */
  async markDiscontinued(supplierId: string, daysThreshold = 90): Promise<number> {
    const query = `
      UPDATE core.supplier_product
      SET is_active = false, updated_at = NOW()
      WHERE supplier_id = $1
        AND is_active = true
        AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '${daysThreshold} days')
      RETURNING supplier_product_id
    `;

    const result = await dbQuery(query, [supplierId]);
    return result.rowCount || 0;
  }

  /**
   * Clear "is_new" flag for products older than N days
   */
  async clearNewFlags(daysThreshold = 30): Promise<number> {
    const query = `
      UPDATE core.supplier_product
      SET is_new = false, updated_at = NOW()
      WHERE is_new = true
        AND first_seen_at < NOW() - INTERVAL '${daysThreshold} days'
      RETURNING supplier_product_id
    `;

    const result = await dbQuery(query);
    return result.rowCount || 0;
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(
    supplierProductId: string,
    limit = 50
  ): Promise<
    Array<{
      price: number;
      currency: string;
      valid_from: Date;
      valid_to: Date | null;
      is_current: boolean;
    }>
  > {
    const query = `
      SELECT price, currency, valid_from, valid_to, is_current
      FROM core.price_history
      WHERE supplier_product_id = $1
      ORDER BY valid_from DESC
      LIMIT $2
    `;

    const result = await dbQuery(query, [supplierProductId, limit]);
    return result.rows;
  }
}

// Export singleton instance
export const supplierProductService = new SupplierProductService();
