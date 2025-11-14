/**
 * Stock Alerts API Endpoint
 * Returns critical, warning, and info level stock alerts
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES, PUBLIC_VIEWS } from '@/lib/db/schema-contract';

export async function GET() {
  try {
    const alertsQuery = `
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
      stock_with_context AS (
        SELECT
          soh.supplier_product_id,
          soh.location_id,
          soh.qty,
          soh.unit_cost,
          soh.total_value,
          arp.reorder_point,
          sp.supplier_sku,
          sp.name_from_supplier,
          sp.product_id,
          p.name AS product_name,
          s.name AS supplier_name,
          sl.name AS location_name,
          sl.type AS location_type,
          lp.price AS unit_price
        FROM ${CORE_TABLES.STOCK_ON_HAND} soh
        JOIN ${CORE_TABLES.STOCK_LOCATION} sl
          ON sl.location_id = soh.location_id
        JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp
          ON sp.supplier_product_id = soh.supplier_product_id
        LEFT JOIN ${CORE_TABLES.PRODUCT} p
          ON p.product_id = sp.product_id
        LEFT JOIN ${CORE_TABLES.SUPPLIER} s
          ON s.supplier_id = sp.supplier_id
        LEFT JOIN latest_prices lp
          ON lp.supplier_product_id = soh.supplier_product_id
        LEFT JOIN active_reorder_points arp
          ON arp.supplier_product_id = soh.supplier_product_id
      ),
      stock_alerts AS (
        -- Critical: Out of stock
        SELECT
          'critical' AS severity,
          COALESCE(swc.product_id, swc.supplier_product_id) AS product_id,
          COALESCE(swc.product_name, swc.name_from_supplier) AS product_name,
          swc.supplier_sku AS sku,
          swc.qty AS quantity,
          swc.reorder_point,
          swc.location_name,
          swc.location_type,
          swc.supplier_name,
          COALESCE(swc.unit_price, 0) AS unit_price,
          'Out of stock' AS alert_message
        FROM stock_with_context swc
        WHERE swc.qty <= 0

        UNION ALL

        -- Warning: Low stock
        SELECT
          'warning' AS severity,
          COALESCE(swc.product_id, swc.supplier_product_id) AS product_id,
          COALESCE(swc.product_name, swc.name_from_supplier) AS product_name,
          swc.supplier_sku AS sku,
          swc.qty AS quantity,
          swc.reorder_point,
          swc.location_name,
          swc.location_type,
          swc.supplier_name,
          COALESCE(swc.unit_price, 0) AS unit_price,
          'Low stock - below reorder point' AS alert_message
        FROM stock_with_context swc
        WHERE swc.qty > 0
          AND swc.reorder_point IS NOT NULL
          AND swc.qty < swc.reorder_point

      )
      SELECT
        severity,
        product_id,
        product_name,
        sku,
        quantity,
        reorder_point,
        location_name,
        location_type,
        supplier_name,
        unit_price,
        alert_message
      FROM stock_alerts
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          ELSE 3
        END,
        quantity ASC NULLS LAST
      LIMIT 100;
    `;

    const countsQuery = `
      WITH active_reorder_points AS (
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
      stock_with_context AS (
        SELECT
          soh.supplier_product_id,
          soh.qty,
          arp.reorder_point
        FROM ${CORE_TABLES.STOCK_ON_HAND} soh
        LEFT JOIN active_reorder_points arp
          ON arp.supplier_product_id = soh.supplier_product_id
      )
      SELECT
        COUNT(*) FILTER (WHERE swc.qty <= 0) AS critical_count,
        COUNT(*) FILTER (
          WHERE swc.qty > 0
            AND swc.reorder_point IS NOT NULL
            AND swc.qty < swc.reorder_point
        ) AS warning_count,
        0 AS info_count
      FROM stock_with_context swc;
    `;

    const [alertsResult, countsResult] = await Promise.all([
      query(alertsQuery, [], { timeout: 5000 }),
      query(countsQuery, [], { timeout: 5000 }),
    ]);

    const alerts = alertsResult.rows.map((row: any) => ({
      severity: row.severity,
      productId: row.product_id,
      productName: row.product_name,
      sku: row.sku,
      quantity: row.quantity !== null ? parseInt(row.quantity) : null,
      reorderPoint: row.reorder_point !== null ? parseInt(row.reorder_point) : null,
      locationName: row.location_name,
      locationType: row.location_type,
      supplierName: row.supplier_name,
      unitPrice: parseFloat(row.unit_price) || 0,
      message: row.alert_message,
    }));

    const counts = countsResult.rows[0] || {};
    const summary = {
      critical: parseInt(counts.critical_count) || 0,
      warning: parseInt(counts.warning_count) || 0,
      info: parseInt(counts.info_count) || 0,
      total: (parseInt(counts.critical_count) || 0) +
             (parseInt(counts.warning_count) || 0) +
             (parseInt(counts.info_count) || 0),
    };

    return NextResponse.json({
      success: true,
      data: alerts,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Stock alerts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
