import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Simple metrics query that works with current schema
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_suppliers,
        COUNT(*) FILTER (WHERE s.active) as active_suppliers,
        0 as pending_approvals,
        0 as contracts_expiring_soon,
        COALESCE(AVG(sp.overall_rating), 0) as avg_performance_rating,
        COALESCE(AVG(sp.on_time_delivery_rate), 0) as on_time_delivery_rate,
        COALESCE(AVG(sp.quality_rating), 0) as quality_acceptance_rate,
        0 as total_purchase_value
      FROM core.supplier s
      LEFT JOIN supplier_performance sp ON s.supplier_id = sp.supplier_id
    `);

    const data = result.rows[0];

    const metrics = {
      totalSuppliers: parseInt(data.total_suppliers) || 0,
      activeSuppliers: parseInt(data.active_suppliers) || 0,
      pendingApprovals: parseInt(data.pending_approvals) || 0,
      contractsExpiringSoon: parseInt(data.contracts_expiring_soon) || 0,
      avgPerformanceRating: parseFloat(data.avg_performance_rating) || 0,
      totalPurchaseValue: parseFloat(data.total_purchase_value) || 0,
      onTimeDeliveryRate: parseFloat(data.on_time_delivery_rate) || 0,
      qualityAcceptanceRate: parseFloat(data.quality_acceptance_rate) || 0,
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
