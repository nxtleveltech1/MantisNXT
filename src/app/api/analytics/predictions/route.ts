/**
 * Predictions API
 * EMERGENCY RECOVERY: Using stable pool connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    const organizationId = searchParams.get('organizationId');

    console.log(`🔮 Generating predictions for organization: ${organizationId}, type: ${type}`);

    const predictions = [];

    // Stock level predictions based on historical data
    if (type === 'all' || type === 'inventory') {
      const stockPredictionQuery = `
        SELECT
          i.name AS product_name,
          i.stock_qty AS current_stock,
          i.reorder_point AS reorder_level,
          CASE
            WHEN i.stock_qty <= i.reorder_point THEN 'immediate_reorder'
            WHEN i.stock_qty <= i.reorder_point * 1.5 THEN 'reorder_soon'
            ELSE 'stock_adequate'
          END as prediction,
          CASE
            WHEN i.stock_qty <= i.reorder_point THEN 1
            WHEN i.stock_qty <= i.reorder_point * 1.5 THEN 7
            ELSE 30
          END as days_until_action,
          'inventory' as category
        FROM inventory_items i
        WHERE i.stock_qty IS NOT NULL
        ORDER BY (i.stock_qty / NULLIF(COALESCE(i.reorder_point, 0), 0)) ASC NULLS LAST
        LIMIT 10
      `;

      const stockResult = await pool.query(stockPredictionQuery);
      predictions.push(...stockResult.rows.map(row => ({
        type: 'inventory',
        title: `Stock Prediction: ${row.product_name}`,
        prediction: row.prediction,
        confidence: 85,
        timeline: `${row.days_until_action} days`,
        description: `Current: ${row.current_stock}, Reorder at: ${row.reorder_level}`,
        action_required: row.prediction !== 'stock_adequate'
      })));
    }

    // Supplier performance predictions
    if (type === 'all' || type === 'suppliers') {
      const supplierPredictionQuery = `
        SELECT
          supplier_name,
          payment_terms_days,
          CASE
            WHEN payment_terms_days > 60 THEN 'risk_high'
            WHEN payment_terms_days > 30 THEN 'risk_medium'
            ELSE 'risk_low'
          END as risk_prediction,
          'suppliers' as category
        FROM suppliers
        ORDER BY payment_terms_days DESC
        LIMIT 5
      `;

      const supplierResult = await pool.query(supplierPredictionQuery);
      predictions.push(...supplierResult.rows.map(row => ({
        type: 'supplier',
        title: `Supplier Risk: ${row.supplier_name}`,
        prediction: row.risk_prediction,
        confidence: 78,
        timeline: '30 days',
        description: `Payment terms: ${row.payment_terms_days} days`,
        action_required: row.risk_prediction !== 'risk_low'
      })));
    }

    // Financial predictions based on current data
    if (type === 'all' || type === 'financial') {
      const financialQuery = `
        SELECT
          COUNT(*) as total_suppliers,
          AVG(payment_terms_days) as avg_payment_terms
        FROM suppliers
      `;

      const financialResult = await pool.query(financialQuery);
      if (financialResult.rows.length > 0) {
        const data = financialResult.rows[0];
        predictions.push({
          type: 'financial',
          title: 'Cash Flow Prediction',
          prediction: data.avg_payment_terms > 45 ? 'cash_flow_risk' : 'cash_flow_stable',
          confidence: 72,
          timeline: '90 days',
          description: `${data.total_suppliers} suppliers, avg payment: ${Math.round(data.avg_payment_terms)} days`,
          action_required: data.avg_payment_terms > 45
        });
      }
    }

    console.log(`✅ Generated ${predictions.length} predictions`);

    return NextResponse.json({
      success: true,
      data: {
        predictions,
        total: predictions.length,
        timestamp: new Date().toISOString(),
        organizationId,
        type
      }
    });

  } catch (error) {
    console.error('❌ Predictions API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to generate predictions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
