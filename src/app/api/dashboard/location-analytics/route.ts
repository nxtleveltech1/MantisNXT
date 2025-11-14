/**
 * Location Analytics API Endpoint
 * Returns product distribution and inventory metrics by location
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES } from '@/lib/db/schema-contract';

export async function GET() {
  try {
    const locationQuery = `
      WITH latest_prices AS (
        SELECT DISTINCT ON (ph.supplier_product_id)
          ph.supplier_product_id,
          ph.price
        FROM ${CORE_TABLES.PRICE_HISTORY} ph
        WHERE ph.is_current = true
        ORDER BY ph.supplier_product_id, ph.valid_from DESC
      ),
      active_reorder_points AS (
        SELECT
          isi.supplier_product_id,
          MAX(isi.reorder_point) AS reorder_point
        FROM ${CORE_TABLES.INVENTORY_SELECTED_ITEM} isi
        JOIN ${CORE_TABLES.INVENTORY_SELECTION} sel
          ON sel.selection_id = isi.selection_id
        WHERE isi.status = 'selected'
          AND sel.status = 'active'
        GROUP BY isi.supplier_product_id
      ),
      location_metrics AS (
        SELECT
          sl.location_id,
          sl.name AS location_name,
          sl.type AS location_type,
          sl.metadata->>'storage_type' AS storage_type,
          COUNT(DISTINCT soh.supplier_product_id) AS product_count,
          COALESCE(SUM(soh.qty), 0) AS total_quantity,
          COALESCE(SUM(soh.qty * COALESCE(lp.price, soh.unit_cost, 0)), 0) AS total_value,
          AVG(soh.qty) AS avg_quantity_per_product,
          COUNT(CASE WHEN soh.qty <= 0 THEN 1 END) AS out_of_stock_count,
          COUNT(
            CASE
              WHEN soh.qty > 0
                AND arp.reorder_point IS NOT NULL
                AND soh.qty < arp.reorder_point
              THEN 1
            END
          ) AS low_stock_count
        FROM ${CORE_TABLES.STOCK_LOCATION} sl
        LEFT JOIN ${CORE_TABLES.STOCK_ON_HAND} soh
          ON sl.location_id = soh.location_id
        LEFT JOIN latest_prices lp
          ON lp.supplier_product_id = soh.supplier_product_id
        LEFT JOIN active_reorder_points arp
          ON arp.supplier_product_id = soh.supplier_product_id
        GROUP BY sl.location_id
      )
      SELECT
        lm.*,
        ROUND((lm.total_value / NULLIF(SUM(lm.total_value) OVER (), 0)) * 100, 2) AS value_percentage
      FROM location_metrics lm
      WHERE lm.product_count > 0
      ORDER BY lm.total_value DESC;
    `;

    const summaryQuery = `
      WITH latest_prices AS (
        SELECT DISTINCT ON (ph.supplier_product_id)
          ph.supplier_product_id,
          ph.price
        FROM ${CORE_TABLES.PRICE_HISTORY} ph
        WHERE ph.is_current = true
        ORDER BY ph.supplier_product_id, ph.valid_from DESC
      ),
      location_distribution AS (
        SELECT
          CASE
            WHEN sl.type IN ('internal', 'main') THEN 'In-Store/Main'
            WHEN sl.type IN ('supplier', 'consignment', 'dropship', 'virtual') THEN 'Dropshipping'
            ELSE 'Other'
          END AS distribution_type,
          soh.supplier_product_id,
          soh.qty,
          COALESCE(lp.price, soh.unit_cost, 0) AS unit_price
        FROM ${CORE_TABLES.STOCK_LOCATION} sl
        LEFT JOIN ${CORE_TABLES.STOCK_ON_HAND} soh
          ON sl.location_id = soh.location_id
        LEFT JOIN latest_prices lp
          ON lp.supplier_product_id = soh.supplier_product_id
        WHERE soh.qty > 0
      )
      SELECT
        distribution_type,
        COUNT(DISTINCT supplier_product_id) AS product_count,
        SUM(qty * unit_price) AS total_value
      FROM location_distribution
      GROUP BY distribution_type
      ORDER BY total_value DESC;
    `;

    const [locationsResult, summaryResult] = await Promise.all([
      query(locationQuery, [], { timeout: 5000 }),
      query(summaryQuery, [], { timeout: 5000 }),
    ]);

    const locations = locationsResult.rows.map((row: any) => ({
      locationId: row.location_id,
      locationName: row.location_name,
      locationType: row.location_type,
      storageType: row.storage_type,
      productCount: parseInt(row.product_count) || 0,
      totalQuantity: parseInt(row.total_quantity) || 0,
      totalValue: parseFloat(row.total_value) || 0,
      avgQuantityPerProduct: parseFloat(row.avg_quantity_per_product) || 0,
      outOfStockCount: parseInt(row.out_of_stock_count) || 0,
      lowStockCount: parseInt(row.low_stock_count) || 0,
      valuePercentage: parseFloat(row.value_percentage) || 0,
    }));

    const distribution = summaryResult.rows.map((row: any) => ({
      type: row.distribution_type,
      productCount: parseInt(row.product_count) || 0,
      totalValue: parseFloat(row.total_value) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        locations,
        distribution,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Location analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch location analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
