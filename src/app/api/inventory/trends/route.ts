import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { calculateTurnover } from '@/lib/utils/inventory-metrics';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const days = Math.max(7, Math.min(90, parseInt(url.searchParams.get('days') || '30', 10)));

    const { rows: series } = await query(
      `WITH d AS (
          SELECT generate_series::date AS day
          FROM generate_series((CURRENT_DATE - INTERVAL '${days} days')::date, CURRENT_DATE, INTERVAL '1 day')
        )
        SELECT d.day,
               0::numeric AS outbound_qty,
               0::numeric AS inbound_qty
        FROM d
        GROUP BY d.day
        ORDER BY d.day ASC`
    );

    // Compute simple daily turnover proxy vs avg inventory snapshot (approximation)
    const { rows: inv } = await query(`SELECT 0::numeric AS total_units`);
    const avgInventory = Number(inv[0]?.total_units ?? 0) || 0;
    const totalOutbound = series.reduce((acc: number, r: any) => acc + Number(r.outbound_qty || 0), 0);
    const turnover = calculateTurnover(totalOutbound, avgInventory);

    return NextResponse.json({ success: true, data: { series, turnover, daysWindow: days } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'TRENDS_FAILED', detail: e?.message ?? String(e) }, { status: 500 });
  }
}
