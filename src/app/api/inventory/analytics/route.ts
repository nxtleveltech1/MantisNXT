import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { calculateTurnover, fillRate } from '@/lib/utils/inventory-metrics';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const days = Math.max(7, Math.min(90, parseInt(url.searchParams.get('days') || '30', 10)));

    // Calculate inventory metrics from core.stock_on_hand
    const { rows: invRows } = await query(`
      SELECT
        COUNT(DISTINCT soh.soh_id)::int AS total_items,
        COUNT(DISTINCT CASE WHEN soh.qty > 0 AND soh.qty <= 10 THEN soh.soh_id END)::int AS low_stock,
        COUNT(DISTINCT CASE WHEN soh.qty = 0 THEN soh.soh_id END)::int AS out_of_stock,
        COALESCE(SUM(soh.qty), 0)::int AS total_units,
        COALESCE(SUM(soh.qty * soh.unit_cost), 0)::numeric AS total_value
      FROM core.stock_on_hand soh
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      WHERE sp.is_active = true
    `);

    // Movements - using core.stock_movement table (singular!)
    const { rows: mvRows } = await query(
      `SELECT movement_type, qty as quantity, movement_ts as created_at
       FROM core.stock_movement
       WHERE movement_ts >= NOW() - INTERVAL '${days} days'
       ORDER BY movement_ts DESC
       LIMIT 1000`
    );

    const totalOutbound = mvRows
      .filter((m: unknown) =>
        String(m.movement_type).toLowerCase() === 'sale' ||
        String(m.movement_type).toLowerCase() === 'outbound' ||
        String(m.movement_type).toLowerCase() === 'shipment'
      )
      .reduce((acc: number, m: unknown) => acc + Math.abs(Number(m.quantity || 0)), 0);

    // Average inventory proxy: use total_units snapshot (approximation)
    const avgInventory = Number(invRows[0]?.total_units || 0) || 1; // avoid division by zero
    const turnover = calculateTurnover(totalOutbound, avgInventory);

    // Calculate stock turnover rate (times per year)
    const stockTurnoverRate = turnover > 0 ? turnover : 0;
    const avgDaysInStock = stockTurnoverRate > 0 ? Math.round(365 / stockTurnoverRate) : 0;

    // Placeholder fill rate using fulfilled vs requested (if available later)
    const forecastAccuracy = 0.85; // integrate proper forecast calc later
    const fr = fillRate(totalOutbound, totalOutbound || 1); // best effort if no requested baseline

    // Calculate excess stock (items with qty > 100) and dead stock (qty = 0)
    const { rows: excessRows } = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN soh.qty > 100 THEN soh.qty * soh.unit_cost ELSE 0 END), 0)::numeric AS excess_value,
        COALESCE(SUM(CASE WHEN soh.qty = 0 THEN soh.unit_cost ELSE 0 END), 0)::numeric AS dead_value
      FROM core.stock_on_hand soh
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      WHERE sp.is_active = true
    `);

    const payload = {
      totalItems: invRows[0]?.total_items ?? 0,
      lowStockItems: invRows[0]?.low_stock ?? 0,
      outOfStockItems: invRows[0]?.out_of_stock ?? 0,
      criticalItems: Math.min(invRows[0]?.low_stock ?? 0, invRows[0]?.out_of_stock ?? 0),
      totalUnits: invRows[0]?.total_units ?? 0,
      totalValue: Number(invRows[0]?.total_value ?? 0),
      stockTurnover: stockTurnoverRate,
      avgDaysInStock: avgDaysInStock,
      forecastAccuracy,
      fillRate: fr,
      excessStockValue: Number(excessRows[0]?.excess_value ?? 0),
      deadStockValue: Number(excessRows[0]?.dead_value ?? 0),
      daysWindow: days,
      reorderPointItems: invRows[0]?.low_stock ?? 0,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: 'ANALYTICS_FAILED', detail: err?.message ?? String(err) }, { status: 500 });
  }
}
