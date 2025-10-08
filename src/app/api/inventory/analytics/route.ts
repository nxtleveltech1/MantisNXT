import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { calculateTurnover, fillRate } from '@/lib/utils/inventory-metrics';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const days = Math.max(7, Math.min(90, parseInt(url.searchParams.get('days') || '30', 10)));

    // Active items
    const { rows: invRows } = await query(`
      SELECT COUNT(*)::int AS total_items,
             SUM(CASE WHEN (stock_qty <= reorder_point AND stock_qty > 0) THEN 1 ELSE 0 END)::int AS low_stock,
             SUM(CASE WHEN stock_qty = 0 THEN 1 ELSE 0 END)::int AS out_of_stock,
             SUM(stock_qty)::int AS total_units,
             SUM(COALESCE(cost_price,0) * stock_qty)::numeric AS total_value
      FROM inventory_items
    `);

    // Movements (use plural table per plan)
    const { rows: mvRows } = await query(
      `SELECT movement_type, quantity::numeric, created_at
       FROM stock_movements
       WHERE created_at >= NOW() - INTERVAL '${days} days'`
    );

    const totalOutbound = mvRows
      .filter((m: any) => String(m.movement_type).toLowerCase() === 'outbound' || String(m.movement_type).toLowerCase() === 'out')
      .reduce((acc: number, m: any) => acc + Number(m.quantity || 0), 0);

    // Average inventory proxy: use total_units snapshot (approximation)
    const avgInventory = Number(invRows[0]?.total_units || 0) || 0;
    const turnover = calculateTurnover(totalOutbound, avgInventory);

    // Placeholder fill rate using fulfilled vs requested (if available later)
    const forecastAccuracy = 0.85; // integrate proper forecast calc later
    const fr = fillRate(totalOutbound, totalOutbound); // best effort if no requested baseline

    // Excess/dead stock approximations
    const { rows: excessRows } = await query(`
      SELECT SUM(CASE WHEN (max_stock_level IS NOT NULL AND stock_qty > max_stock_level)
                      THEN (stock_qty - max_stock_level) * COALESCE(cost_price,0) ELSE 0 END)::numeric AS excess_value,
             SUM(CASE WHEN (stock_qty = 0 AND updated_at < NOW() - INTERVAL '90 days')
                      THEN COALESCE(cost_price,0) ELSE 0 END)::numeric AS dead_value
      FROM inventory_items
    `);

    const payload = {
      totalItems: invRows[0]?.total_items ?? 0,
      lowStock: invRows[0]?.low_stock ?? 0,
      outOfStock: invRows[0]?.out_of_stock ?? 0,
      totalUnits: invRows[0]?.total_units ?? 0,
      totalValue: Number(invRows[0]?.total_value ?? 0),
      turnover,
      forecastAccuracy,
      fillRate: fr,
      criticalItems: invRows[0]?.low_stock ?? 0,
      excessStockValue: Number(excessRows[0]?.excess_value ?? 0),
      deadStockValue: Number(excessRows[0]?.dead_value ?? 0),
      daysWindow: days,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'ANALYTICS_FAILED', detail: err?.message ?? String(err) }, { status: 500 });
  }
}
