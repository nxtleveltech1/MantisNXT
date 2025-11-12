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
      WITH location_metrics AS (
        SELECT
          sl.location_id,
          sl.location_name,
          sl.location_type,
          sl.metadata->>'storage_type' as storage_type,
          COUNT(DISTINCT soh.product_id) as product_count,
          SUM(soh.quantity) as total_quantity,
          SUM(soh.quantity * COALESCE(ph.price, 0)) as total_value,
          AVG(soh.quantity) as avg_quantity_per_product,
          COUNT(CASE WHEN soh.quantity = 0 THEN 1 END) as out_of_stock_count,
          COUNT(CASE WHEN soh.quantity > 0 AND soh.quantity < soh.reorder_point THEN 1 END) as low_stock_count
        FROM ${CORE_TABLES.STOCK_LOCATION} sl
        LEFT JOIN ${CORE_TABLES.STOCK_ON_HAND} soh ON sl.location_id = soh.location_id
        LEFT JOIN LATERAL (
          SELECT price
          FROM ${CORE_TABLES.PRICE_HISTORY}
          WHERE supplier_product_id = soh.product_id AND is_current = true
          LIMIT 1
        ) ph ON true
        GROUP BY sl.location_id, sl.location_name, sl.location_type, sl.metadata
      ),
      location_categories AS (
        SELECT
          'in-store' as category,
          SUM(product_count) as product_count,
          SUM(total_value) as total_value
        FROM location_metrics
        WHERE location_type IN ('warehouse', 'store', 'main')
        UNION ALL
        SELECT
          'dropship' as category,
          SUM(product_count) as product_count,
          SUM(total_value) as total_value
        FROM location_metrics
        WHERE location_type IN ('dropship', 'supplier', 'virtual')
      )
      SELECT
        lm.*,
        ROUND((lm.total_value / NULLIF(SUM(lm.total_value) OVER (), 0)) * 100, 2) as value_percentage
      FROM location_metrics lm
      WHERE lm.product_count > 0
      ORDER BY lm.total_value DESC;
    `;

    const summaryQuery = `
      SELECT
        CASE
          WHEN location_type IN ('warehouse', 'store', 'main') THEN 'In-Store/Main'
          WHEN location_type IN ('dropship', 'supplier', 'virtual') THEN 'Dropshipping'
          ELSE 'Other'
        END as distribution_type,
        COUNT(DISTINCT soh.product_id) as product_count,
        SUM(soh.quantity * COALESCE(ph.price, 0)) as total_value
      FROM ${CORE_TABLES.STOCK_LOCATION} sl
      LEFT JOIN ${CORE_TABLES.STOCK_ON_HAND} soh ON sl.location_id = soh.location_id
      LEFT JOIN LATERAL (
        SELECT price
        FROM ${CORE_TABLES.PRICE_HISTORY}
        WHERE supplier_product_id = soh.product_id AND is_current = true
        LIMIT 1
      ) ph ON true
      WHERE soh.quantity > 0
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
