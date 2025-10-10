/**
 * StockService - Manages stock on hand (SOH) reporting
 *
 * Responsibilities:
 * - Record stock snapshots
 * - Generate SOH reports by supplier
 * - Generate rolled-up SOH reports
 * - Track stock movements
 * - Calculate inventory values
 */

import { neonDb } from "../../../lib/database/neon-connection";
import { isFeatureEnabled, FeatureFlag } from "@/lib/feature-flags";
import {
  StockOnHand,
  SohBySupplier,
  SohRolledUp,
  SohReportRequest,
  SohReportRequestSchema,
  StockOnHandSchema,
  NxtSoh,
  NxtSohSchema,
} from "../../types/nxt-spp";

export class StockService {
  /**
   * Get total count of NXT SOH records (selected items only) for pagination
   */
  async getNxtSohCount(filters?: {
    supplier_ids?: string[];
    location_ids?: string[];
    search?: string;
  }): Promise<number> {
    // If using view, count from view
    if (isFeatureEnabled(FeatureFlag.USE_NXT_SOH_VIEW)) {
      const conditions: string[] = ["1=1"];
      const params: any[] = [];
      let idx = 1;
      if (filters?.supplier_ids?.length) {
        conditions.push(`supplier_id = ANY($${idx++}::uuid[])`);
        params.push(filters.supplier_ids);
      }
      if (filters?.location_ids?.length) {
        conditions.push(`location_id = ANY($${idx++}::uuid[])`);
        params.push(filters.location_ids);
      }
      if (filters?.search) {
        conditions.push(
          `(product_name ILIKE $${idx} OR supplier_sku ILIKE $${idx})`
        );
        params.push(`%${filters.search}%`);
        idx++;
      }
      const q = `SELECT COUNT(*) AS cnt FROM serve.v_nxt_soh WHERE ${conditions.join(
        " AND "
      )}`;
      const r = await neonDb.query<{ cnt: string }>(q, params);
      return parseInt(r.rows[0]?.cnt || "0", 10);
    }

    // Legacy path: count with selection constraint
    const conditions: string[] = [
      `EXISTS(
        SELECT 1 FROM core.inventory_selected_item isi
        JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id
        WHERE isi.supplier_product_id = sp.supplier_product_id
          AND sel.status = 'active'
          AND isi.status = 'selected'
      )`,
    ];
    const params: any[] = [];
    let idx = 1;
    if (filters?.supplier_ids?.length) {
      conditions.push(`s.supplier_id = ANY($${idx++}::uuid[])`);
      params.push(filters.supplier_ids);
    }
    if (filters?.location_ids?.length) {
      conditions.push(`l.location_id = ANY($${idx++}::uuid[])`);
      params.push(filters.location_ids);
    }
    if (filters?.search) {
      conditions.push(
        `(sp.name_from_supplier ILIKE $${idx} OR sp.supplier_sku ILIKE $${idx})`
      );
      params.push(`%${filters.search}%`);
      idx++;
    }

    const q = `
      WITH latest_stock AS (
        SELECT DISTINCT ON (location_id, supplier_product_id)
          location_id, supplier_product_id, as_of_ts
        FROM core.stock_on_hand
        ORDER BY location_id, supplier_product_id, as_of_ts DESC
      )
      SELECT COUNT(*) AS cnt
      FROM latest_stock soh
      JOIN core.stock_location l ON l.location_id = soh.location_id
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      WHERE ${conditions.join(" AND ")}
    `;
    const r = await neonDb.query<{ cnt: string }>(q, params);
    return parseInt(r.rows[0]?.cnt || "0", 10);
  }
  /**
   * Record a stock snapshot
   */
  async recordStock(data: {
    location_id: string;
    supplier_product_id: string;
    qty: number;
    unit_cost?: number;
    as_of_ts?: Date;
    source?: "manual" | "import" | "system";
  }): Promise<StockOnHand> {
    const validated = StockOnHandSchema.parse({
      ...data,
      as_of_ts: data.as_of_ts || new Date(),
      source: data.source || "manual",
    });

    const query = `
      INSERT INTO core.stock_on_hand (
        location_id, supplier_product_id, qty, unit_cost, as_of_ts, source
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      validated.location_id,
      validated.supplier_product_id,
      validated.qty,
      validated.unit_cost || null,
      validated.as_of_ts,
      validated.source,
    ];

    const result = await neonDb.query<StockOnHand>(query, values);
    return result.rows[0];
  }

  /**
   * Bulk import stock snapshots
   */
  async bulkImportStock(
    stocks: Array<{
      location_id: string;
      supplier_product_id: string;
      qty: number;
      unit_cost?: number;
      as_of_ts?: Date;
    }>
  ): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    await neonDb.withTransaction(async (client) => {
      // Batch insert for performance
      const batchSize = 100;
      for (let i = 0; i < stocks.length; i += batchSize) {
        const batch = stocks.slice(i, i + batchSize);

        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        batch.forEach((stock) => {
          const asOfTs = stock.as_of_ts || new Date();

          placeholders.push(
            `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
              `$${paramIndex++}, $${paramIndex++}, 'import')`
          );

          values.push(
            stock.location_id,
            stock.supplier_product_id,
            stock.qty,
            stock.unit_cost || null,
            asOfTs
          );
        });

        try {
          const query = `
            INSERT INTO core.stock_on_hand (
              location_id, supplier_product_id, qty, unit_cost, as_of_ts, source
            )
            VALUES ${placeholders.join(", ")}
          `;

          const result = await client.query(query, values);
          imported += result.rowCount || 0;
        } catch (error) {
          errors.push(
            `Batch ${i / batchSize + 1} failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    });

    return { imported, errors };
  }

  /**
   * Get SOH by supplier
   */
  async getSohBySupplier(request: SohReportRequest): Promise<SohBySupplier[]> {
    const validated = SohReportRequestSchema.parse(request);

    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    let paramIndex = 1;

    if (validated.supplier_ids && validated.supplier_ids.length > 0) {
      conditions.push(`s.supplier_id = ANY($${paramIndex++}::uuid[])`);
      params.push(validated.supplier_ids);
    }

    if (validated.location_ids && validated.location_ids.length > 0) {
      conditions.push(`l.location_id = ANY($${paramIndex++}::uuid[])`);
      params.push(validated.location_ids);
    }

    if (validated.product_ids && validated.product_ids.length > 0) {
      conditions.push(`sp.product_id = ANY($${paramIndex++}::uuid[])`);
      params.push(validated.product_ids);
    }

    if (!validated.include_zero_stock) {
      conditions.push("soh.qty > 0");
    }

    if (validated.selected_only) {
      conditions.push(
        `EXISTS(
          SELECT 1 FROM core.inventory_selected_item isi
          JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id
          WHERE isi.supplier_product_id = sp.supplier_product_id
            AND sel.status = 'active'
            AND isi.status = 'selected'
        )`
      );
    }

    const asOfCondition = validated.as_of_date
      ? `soh.as_of_ts <= $${paramIndex++}`
      : "1=1";

    if (validated.as_of_date) {
      params.push(validated.as_of_date);
    }

    const query = `
      WITH latest_stock AS (
        SELECT DISTINCT ON (location_id, supplier_product_id)
          soh_id,
          location_id,
          supplier_product_id,
          qty,
          unit_cost,
          total_value,
          as_of_ts
        FROM core.stock_on_hand
        WHERE ${asOfCondition}
        ORDER BY location_id, supplier_product_id, as_of_ts DESC
      ),
      current_prices AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          price,
          currency
        FROM core.price_history
        WHERE is_current = true
        ORDER BY supplier_product_id, valid_from DESC
      )
      SELECT
        s.supplier_id,
        s.name as supplier_name,
        sp.supplier_product_id,
        sp.supplier_sku,
        sp.name_from_supplier as product_name,
        l.location_id,
        l.name as location_name,
        soh.qty as qty_on_hand,
        COALESCE(soh.unit_cost, cp.price, 0) as unit_cost,
        COALESCE(soh.total_value, soh.qty * cp.price, 0) as total_value,
        cp.currency,
        soh.as_of_ts,
        EXISTS(
          SELECT 1 FROM core.inventory_selected_item isi
          JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id
          WHERE isi.supplier_product_id = sp.supplier_product_id
            AND sel.status = 'active'
            AND isi.status = 'selected'
        ) as is_selected
      FROM latest_stock soh
      JOIN core.stock_location l ON l.location_id = soh.location_id
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY s.name, sp.name_from_supplier, l.name
    `;

    const result = await neonDb.query<SohBySupplier>(query, params);
    return result.rows;
  }

  /**
   * Get rolled-up SOH (aggregated across suppliers)
   */
  async getSohRolledUp(request: SohReportRequest): Promise<SohRolledUp[]> {
    const validated = SohReportRequestSchema.parse(request);

    const conditions: string[] = ["sp.product_id IS NOT NULL"];
    const params: any[] = [];
    let paramIndex = 1;

    if (validated.product_ids && validated.product_ids.length > 0) {
      conditions.push(`p.product_id = ANY($${paramIndex++}::uuid[])`);
      params.push(validated.product_ids);
    }

    if (validated.selected_only) {
      conditions.push(
        `EXISTS(
          SELECT 1 FROM core.inventory_selected_item isi
          JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id
          WHERE isi.supplier_product_id = sp.supplier_product_id
            AND sel.status = 'active'
            AND isi.status = 'selected'
        )`
      );
    }

    const asOfCondition = validated.as_of_date
      ? `soh.as_of_ts <= $${paramIndex++}`
      : "1=1";

    if (validated.as_of_date) {
      params.push(validated.as_of_date);
    }

    const query = `
      WITH latest_stock AS (
        SELECT DISTINCT ON (location_id, supplier_product_id)
          supplier_product_id,
          qty,
          unit_cost,
          total_value,
          as_of_ts
        FROM core.stock_on_hand
        WHERE ${asOfCondition}
        ORDER BY location_id, supplier_product_id, as_of_ts DESC
      ),
      current_prices AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          price,
          currency
        FROM core.price_history
        WHERE is_current = true
        ORDER BY supplier_product_id, valid_from DESC
      ),
      product_stock AS (
        SELECT
          p.product_id,
          p.name as product_name,
          c.name as category_name,
          sp.supplier_id,
          s.name as supplier_name,
          SUM(soh.qty) as supplier_qty,
          AVG(COALESCE(soh.unit_cost, cp.price, 0)) as avg_cost,
          SUM(COALESCE(soh.total_value, soh.qty * cp.price, 0)) as supplier_value,
          MAX(soh.as_of_ts) as as_of_ts
        FROM latest_stock soh
        JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
        JOIN core.product p ON p.product_id = sp.product_id
        JOIN core.supplier s ON s.supplier_id = sp.supplier_id
        LEFT JOIN core.category c ON c.category_id = p.category_id
        LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
        WHERE ${conditions.join(" AND ")}
        GROUP BY p.product_id, p.name, c.name, sp.supplier_id, s.name
      )
      SELECT
        product_id,
        product_name,
        category_name,
        SUM(supplier_qty) as total_qty,
        COUNT(DISTINCT supplier_id) as supplier_count,
        SUM(supplier_value) as total_value,
        SUM(supplier_value) / NULLIF(SUM(supplier_qty), 0) as weighted_avg_cost,
        jsonb_agg(
          jsonb_build_object(
            'supplier_id', supplier_id,
            'supplier_name', supplier_name,
            'qty', supplier_qty,
            'value', supplier_value
          ) ORDER BY supplier_name
        ) as suppliers,
        MAX(as_of_ts) as as_of_ts
      FROM product_stock
      GROUP BY product_id, product_name, category_name
      ORDER BY product_name
    `;

    const result = await neonDb.query(query, params);

    // Transform the jsonb suppliers array
    return result.rows.map((row) => ({
      ...row,
      total_qty: parseFloat(row.total_qty),
      supplier_count: parseInt(row.supplier_count),
      total_value: parseFloat(row.total_value),
      weighted_avg_cost: parseFloat(row.weighted_avg_cost),
      suppliers: row.suppliers || [],
    }));
  }

  /**
   * Get latest stock for a specific product at a location
   */
  async getLatestStock(
    locationId: string,
    supplierProductId: string
  ): Promise<StockOnHand | null> {
    const query = `
      SELECT * FROM core.stock_on_hand
      WHERE location_id = $1 AND supplier_product_id = $2
      ORDER BY as_of_ts DESC
      LIMIT 1
    `;

    const result = await neonDb.query<StockOnHand>(query, [
      locationId,
      supplierProductId,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Get stock history for a product
   */
  async getStockHistory(
    supplierProductId: string,
    locationId?: string,
    limit = 100
  ): Promise<StockOnHand[]> {
    const conditions = ["supplier_product_id = $1"];
    const params: any[] = [supplierProductId];
    let paramIndex = 2;

    if (locationId) {
      conditions.push(`location_id = $${paramIndex++}`);
      params.push(locationId);
    }

    const query = `
      SELECT * FROM core.stock_on_hand
      WHERE ${conditions.join(" AND ")}
      ORDER BY as_of_ts DESC
      LIMIT $${paramIndex}
    `;
    params.push(limit);

    const result = await neonDb.query<StockOnHand>(query, params);
    return result.rows;
  }

  /**
   * Calculate total inventory value
   */
  async getTotalInventoryValue(filters?: {
    supplier_ids?: string[];
    location_ids?: string[];
    selected_only?: boolean;
  }): Promise<{
    total_value: number;
    total_qty: number;
    by_supplier: Array<{
      supplier_id: string;
      supplier_name: string;
      value: number;
      qty: number;
    }>;
  }> {
    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.supplier_ids && filters.supplier_ids.length > 0) {
      conditions.push(`s.supplier_id = ANY($${paramIndex++}::uuid[])`);
      params.push(filters.supplier_ids);
    }

    if (filters?.location_ids && filters.location_ids.length > 0) {
      conditions.push(`soh.location_id = ANY($${paramIndex++}::uuid[])`);
      params.push(filters.location_ids);
    }

    if (filters?.selected_only) {
      conditions.push(
        `EXISTS(
          SELECT 1 FROM core.inventory_selected_item isi
          JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id
          WHERE isi.supplier_product_id = sp.supplier_product_id
            AND sel.status = 'active'
            AND isi.status = 'selected'
        )`
      );
    }

    const query = `
      WITH latest_stock AS (
        SELECT DISTINCT ON (location_id, supplier_product_id)
          supplier_product_id,
          qty,
          unit_cost,
          total_value
        FROM core.stock_on_hand
        ORDER BY location_id, supplier_product_id, as_of_ts DESC
      ),
      current_prices AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          price
        FROM core.price_history
        WHERE is_current = true
        ORDER BY supplier_product_id, valid_from DESC
      )
      SELECT
        s.supplier_id,
        s.name as supplier_name,
        SUM(COALESCE(soh.total_value, soh.qty * cp.price, 0)) as value,
        SUM(soh.qty) as qty
      FROM latest_stock soh
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY s.supplier_id, s.name
      ORDER BY value DESC
    `;

    const result = await neonDb.query(query, params);

    const bySupplier = result.rows.map((row) => ({
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name,
      value: parseFloat(row.value || 0),
      qty: parseFloat(row.qty || 0),
    }));

    const totalValue = bySupplier.reduce((sum, s) => sum + s.value, 0);
    const totalQty = bySupplier.reduce((sum, s) => sum + s.qty, 0);

    return {
      total_value: totalValue,
      total_qty: totalQty,
      by_supplier: bySupplier,
    };
  }

  /**
   * Get NXT SOH (Stock on Hand) - Authoritative view of SELECTED items only
   *
   * **This is the single source of truth for operational stock queries.**
   *
   * Returns ONLY items in the active selection. If no active selection exists,
   * returns empty array.
   *
   * This method should be used by all downstream modules (inventory, orders,
   * invoices, reporting) instead of direct stock queries.
   *
   * @param filters - Optional filters for supplier, location, and search
   * @returns Array of NXT SOH records
   */
  async getNxtSoh(filters?: {
    supplier_ids?: string[];
    location_ids?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<NxtSoh[]> {
    // If USE_NXT_SOH_VIEW feature flag is enabled, query the view directly
    if (isFeatureEnabled(FeatureFlag.USE_NXT_SOH_VIEW)) {
      return await this.getNxtSohFromView(filters);
    }

    // Otherwise, construct the query manually (fallback for Phase 1)
    return await this.getNxtSohLegacy(filters);
  }

  /**
   * Query NXT SOH from serve.v_nxt_soh view
   * (Used when USE_NXT_SOH_VIEW feature flag is enabled)
   */
  private async getNxtSohFromView(filters?: {
    supplier_ids?: string[];
    location_ids?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<NxtSoh[]> {
    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.supplier_ids && filters.supplier_ids.length > 0) {
      conditions.push(`supplier_id = ANY($${paramIndex++}::uuid[])`);
      params.push(filters.supplier_ids);
    }

    if (filters?.location_ids && filters.location_ids.length > 0) {
      conditions.push(`location_id = ANY($${paramIndex++}::uuid[])`);
      params.push(filters.location_ids);
    }

    if (filters?.search) {
      conditions.push(
        `(product_name ILIKE $${paramIndex} OR supplier_sku ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const limit = filters?.limit || 1000;
    const offset = filters?.offset || 0;

    const query = `
      SELECT *
      FROM serve.v_nxt_soh
      WHERE ${conditions.join(" AND ")}
      ORDER BY supplier_name, product_name
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    params.push(limit, offset);

    const result = await neonDb.query<NxtSoh>(query, params);
    return result.rows;
  }

  /**
   * Legacy NXT SOH query (constructs the query manually)
   * (Used when USE_NXT_SOH_VIEW feature flag is disabled)
   */
  private async getNxtSohLegacy(filters?: {
    supplier_ids?: string[];
    location_ids?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<NxtSoh[]> {
    const conditions: string[] = [
      // Only include items in active selection
      `EXISTS(
        SELECT 1 FROM core.inventory_selected_item isi
        JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id
        WHERE isi.supplier_product_id = sp.supplier_product_id
          AND sel.status = 'active'
          AND isi.status = 'selected'
      )`,
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.supplier_ids && filters.supplier_ids.length > 0) {
      conditions.push(`s.supplier_id = ANY($${paramIndex++}::uuid[])`);
      params.push(filters.supplier_ids);
    }

    if (filters?.location_ids && filters.location_ids.length > 0) {
      conditions.push(`l.location_id = ANY($${paramIndex++}::uuid[])`);
      params.push(filters.location_ids);
    }

    if (filters?.search) {
      conditions.push(
        `(sp.name_from_supplier ILIKE $${paramIndex} OR sp.supplier_sku ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const limit = filters?.limit || 1000;
    const offset = filters?.offset || 0;

    const query = `
      WITH latest_stock AS (
        SELECT DISTINCT ON (location_id, supplier_product_id)
          location_id,
          supplier_product_id,
          qty,
          unit_cost,
          total_value,
          as_of_ts
        FROM core.stock_on_hand
        ORDER BY location_id, supplier_product_id, as_of_ts DESC
      ),
      current_prices AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          price,
          currency
        FROM core.price_history
        WHERE is_current = true
        ORDER BY supplier_product_id, valid_from DESC
      ),
      active_selection AS (
        SELECT selection_id, selection_name
        FROM core.inventory_selection
        WHERE status = 'active'
        LIMIT 1
      )
      SELECT
        s.supplier_id,
        s.name as supplier_name,
        sp.supplier_product_id,
        sp.supplier_sku,
        sp.name_from_supplier as product_name,
        l.location_id,
        l.name as location_name,
        soh.qty as qty_on_hand,
        COALESCE(soh.unit_cost, cp.price, 0) as unit_cost,
        COALESCE(soh.total_value, soh.qty * cp.price, 0) as total_value,
        COALESCE(cp.currency, s.default_currency, 'ZAR') as currency,
        soh.as_of_ts,
        sel.selection_id,
        sel.selection_name
      FROM latest_stock soh
      JOIN core.stock_location l ON l.location_id = soh.location_id
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      CROSS JOIN active_selection sel
      WHERE ${conditions.join(" AND ")}
      ORDER BY s.name, sp.name_from_supplier, l.name
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    params.push(limit, offset);

    const result = await neonDb.query<NxtSoh>(query, params);
    return result.rows;
  }
}

// Export singleton instance
export const stockService = new StockService();
