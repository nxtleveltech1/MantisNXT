/**
 * Anomalies Detection API
 * EMERGENCY RECOVERY: Using stable pool connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log(`🔍 Fetching anomalies for organization: ${organizationId}`);

    // Detect inventory anomalies (low stock, unusual movements)
    const inventoryAnomaliesQuery = `
      SELECT
        'inventory' as type,
        'Low Stock Alert' as title,
        CONCAT('Item ', name, ' has only ', stock_qty, ' units left') as description,
        'high' as severity,
        stock_qty as value,
        reorder_point as threshold,
        NOW() as detected_at
      FROM inventory_items
      WHERE stock_qty <= reorder_point
      AND stock_qty > 0
      ORDER BY (reorder_point - stock_qty) DESC
      LIMIT $1
    `;

    // Detect supplier anomalies (performance issues)
    const supplierAnomaliesQuery = `
      SELECT
        'supplier' as type,
        'Supplier Performance Issue' as title,
        CONCAT('Supplier ', COALESCE(name, supplier_name, company_name), ' has concerning metrics') as description,
        CASE
          WHEN payment_terms_days > 60 THEN 'high'
          WHEN payment_terms_days > 30 THEN 'medium'
          ELSE 'low'
        END as severity,
        payment_terms_days as value,
        30 as threshold,
        NOW() as detected_at
      FROM suppliers
      WHERE payment_terms_days > 30
      ORDER BY payment_terms_days DESC
      LIMIT $1
    `;

    const [inventoryResult, supplierResult] = await Promise.all([
      pool.query(inventoryAnomaliesQuery, [Math.floor(limit / 2)]),
      pool.query(supplierAnomaliesQuery, [Math.floor(limit / 2)])
    ]);

    const anomalies = [
      ...inventoryResult.rows,
      ...supplierResult.rows
    ].slice(0, limit);

    console.log(`✅ Found ${anomalies.length} anomalies`);

    return NextResponse.json({
      success: true,
      data: {
        anomalies,
        total: anomalies.length,
        timestamp: new Date().toISOString(),
        organizationId
      }
    });

  } catch (error) {
    console.error('❌ Anomalies API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch anomalies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
