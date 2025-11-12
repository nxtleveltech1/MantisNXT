/**
 * Stock Alerts API Endpoint
 * Returns critical, warning, and info level stock alerts
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/database/unified-connection';
import { CORE_TABLES, PUBLIC_VIEWS } from '@/lib/db/schema-contract';

export async function GET() {
  try {
    const alertsQuery = `
      WITH stock_alerts AS (
        -- Critical: Out of stock
        SELECT
          'critical' as severity,
          soh.product_id,
          p.name as product_name,
          p.sku,
          soh.quantity,
          soh.reorder_point,
          sl.location_name,
          sl.location_type,
          sp.name as supplier_name,
          COALESCE(ph.price, 0) as unit_price,
          'Out of stock' as alert_message
        FROM ${CORE_TABLES.STOCK_ON_HAND} soh
        JOIN ${CORE_TABLES.PRODUCT} p ON soh.product_id = p.product_id
        JOIN ${CORE_TABLES.STOCK_LOCATION} sl ON soh.location_id = sl.location_id
        LEFT JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp_link ON p.product_id = sp_link.supplier_product_id
        LEFT JOIN ${PUBLIC_VIEWS.SUPPLIERS} sp ON sp_link.supplier_id = sp.id
        LEFT JOIN LATERAL (
          SELECT price
          FROM ${CORE_TABLES.PRICE_HISTORY}
          WHERE supplier_product_id = soh.product_id AND is_current = true
          LIMIT 1
        ) ph ON true
        WHERE soh.quantity = 0

        UNION ALL

        -- Warning: Low stock
        SELECT
          'warning' as severity,
          soh.product_id,
          p.name as product_name,
          p.sku,
          soh.quantity,
          soh.reorder_point,
          sl.location_name,
          sl.location_type,
          sp.name as supplier_name,
          COALESCE(ph.price, 0) as unit_price,
          'Low stock - below reorder point' as alert_message
        FROM ${CORE_TABLES.STOCK_ON_HAND} soh
        JOIN ${CORE_TABLES.PRODUCT} p ON soh.product_id = p.product_id
        JOIN ${CORE_TABLES.STOCK_LOCATION} sl ON soh.location_id = sl.location_id
        LEFT JOIN ${CORE_TABLES.SUPPLIER_PRODUCT} sp_link ON p.product_id = sp_link.supplier_product_id
        LEFT JOIN ${PUBLIC_VIEWS.SUPPLIERS} sp ON sp_link.supplier_id = sp.id
        LEFT JOIN LATERAL (
          SELECT price
          FROM ${CORE_TABLES.PRICE_HISTORY}
          WHERE supplier_product_id = soh.product_id AND is_current = true
          LIMIT 1
        ) ph ON true
        WHERE soh.quantity > 0 AND soh.quantity < soh.reorder_point

        UNION ALL

        -- Info: Expiring pricelists
        SELECT
          'info' as severity,
          NULL as product_id,
          spl.name as product_name,
          NULL as sku,
          NULL as quantity,
          NULL as reorder_point,
          s.name as location_name,
          'pricelist' as location_type,
          s.name as supplier_name,
          NULL as unit_price,
          'Pricelist expiring in ' ||
            EXTRACT(DAY FROM (spl.effective_to - CURRENT_DATE))::text ||
            ' days' as alert_message
        FROM ${CORE_TABLES.SUPPLIER_PRICELISTS} spl
        JOIN ${PUBLIC_VIEWS.SUPPLIERS} s ON spl.supplier_id = s.id
        WHERE spl.effective_to IS NOT NULL
          AND spl.effective_to > CURRENT_DATE
          AND spl.effective_to <= CURRENT_DATE + INTERVAL '30 days'
          AND spl.is_active = true
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
          WHEN 'info' THEN 3
        END,
        quantity ASC NULLS LAST
      LIMIT 100;
    `;

    const countsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE soh.quantity = 0) as critical_count,
        COUNT(*) FILTER (WHERE soh.quantity > 0 AND soh.quantity < soh.reorder_point) as warning_count,
        (
          SELECT COUNT(*)
          FROM ${CORE_TABLES.SUPPLIER_PRICELISTS}
          WHERE effective_to IS NOT NULL
            AND effective_to > CURRENT_DATE
            AND effective_to <= CURRENT_DATE + INTERVAL '30 days'
            AND is_active = true
        ) as info_count
      FROM ${CORE_TABLES.STOCK_ON_HAND} soh;
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
