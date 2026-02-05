import { getOrSet, makeKey } from '@/lib/cache/responseCache';
/**
 * Predictions API
 * EMERGENCY RECOVERY: Using stable pool connection
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  const cacheKey = makeKey(request.url);
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    const organizationId = searchParams.get('organizationId');

    console.log(`🔮 Generating predictions for organization: ${organizationId}, type: ${type}`);

    const predictions: Array<{
      type: string;
      title: string;
      prediction: string;
      confidence: number;
      timeline: string;
      description: string;
      action_required: boolean;
    }> = [];

    // Stock level predictions based on historical data
    if (type === 'all' || type === 'inventory') {
      const stockPredictionQuery = `
        SELECT
          sp.name_from_supplier AS product_name,
          COALESCE(soh.qty, 0) AS current_stock,
          10 AS reorder_level,
          CASE
            WHEN COALESCE(soh.qty, 0) = 0 THEN 'urgent_reorder'
            WHEN COALESCE(soh.qty, 0) <= 10 THEN 'reorder_soon'
            ELSE 'stock_adequate'
          END as prediction,
          CASE
            WHEN COALESCE(soh.qty, 0) = 0 THEN 0
            WHEN COALESCE(soh.qty, 0) <= 10 THEN 7
            ELSE 30
          END as days_until_action,
          'inventory' as category
        FROM core.supplier_product sp
        LEFT JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
        WHERE sp.is_active = true
        ORDER BY COALESCE(soh.qty, 0) ASC
        LIMIT 10
      `;

      const stockResult = await pool.query(stockPredictionQuery);
      const totalProducts = stockResult.rows.length;
      const productsWithStock = stockResult.rows.filter(r => Number(r.current_stock) > 0).length;
      const dataCoverage = totalProducts > 0 ? Math.round((productsWithStock / totalProducts) * 100) : 0;

      predictions.push(
        ...stockResult.rows.map(row => ({
          type: 'inventory',
          title: `Stock Prediction: ${row.product_name}`,
          prediction: row.prediction,
          confidence: Math.min(95, Math.max(30, dataCoverage)),
          timeline: `${row.days_until_action} days`,
          description: `Current: ${row.current_stock}, Reorder at: ${row.reorder_level}`,
          action_required: row.prediction !== 'stock_adequate',
        }))
      );
    }

    // Supplier performance predictions
    if (type === 'all' || type === 'suppliers') {
      const supplierPredictionQuery = `
        SELECT
          name as supplier_name,
          COALESCE(
            CASE
              WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
              ELSE 30
            END, 30
          ) as payment_terms_days,
          CASE
            WHEN COALESCE(
              CASE
                WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
                ELSE 30
              END, 30
            ) > 60 THEN 'risk_high'
            WHEN COALESCE(
              CASE
                WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
                ELSE 30
              END, 30
            ) > 30 THEN 'risk_medium'
            ELSE 'risk_low'
          END as risk_prediction,
          'suppliers' as category
        FROM core.supplier
        ORDER BY COALESCE(
          CASE
            WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
            ELSE 30
          END, 30
        ) DESC
        LIMIT 5
      `;

      const supplierResult = await pool.query(supplierPredictionQuery);
      predictions.push(
        ...supplierResult.rows.map(row => ({
          type: 'supplier',
          title: `Supplier Risk: ${row.supplier_name}`,
          prediction: row.risk_prediction,
          confidence: row.risk_prediction === 'risk_high' ? 90 : row.risk_prediction === 'risk_medium' ? 75 : 60,
          timeline: '30 days',
          description: `Payment terms: ${row.payment_terms_days} days`,
          action_required: row.risk_prediction !== 'risk_low',
        }))
      );
    }

    // Financial predictions based on current data
    if (type === 'all' || type === 'financial') {
      const financialQuery = `
        SELECT
          COUNT(*) as total_suppliers,
          AVG(
            COALESCE(
              CASE
                WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
                ELSE 30
              END, 30
            )
          ) as avg_payment_terms
        FROM core.supplier
      `;

      const financialResult = await pool.query(financialQuery);
      if (financialResult.rows.length > 0) {
        const data = financialResult.rows[0];
        predictions.push({
          type: 'financial',
          title: 'Cash Flow Prediction',
          prediction: data.avg_payment_terms > 45 ? 'cash_flow_risk' : 'cash_flow_stable',
          confidence: data.total_suppliers > 10 ? 80 : data.total_suppliers > 5 ? 65 : 45,
          timeline: '90 days',
          description: `${data.total_suppliers} suppliers, avg payment: ${Math.round(data.avg_payment_terms)} days`,
          action_required: data.avg_payment_terms > 45,
        });
      }
    }

    console.log(`✅ Generated ${predictions.length} predictions`);

    return NextResponse.json(
      await getOrSet(cacheKey, async () => ({
        success: true,
        data: {
          predictions,
          total: predictions.length,
          timestamp: new Date().toISOString(),
          organizationId,
          type,
        },
      }))
    );
  } catch (error) {
    console.error('❌ Predictions API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate predictions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
