import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRateLimiter } from '@/lib/utils/rate-limiter';
import { IntegrationSyncService } from '@/lib/services/IntegrationSyncService';

export async function POST(request: NextRequest) {
  try {
    const orgIdHeader = request.headers.get('x-org-id') || undefined;
    if (!orgIdHeader)
      return NextResponse.json({ success: false, error: 'orgId required' }, { status: 400 });
    const limiter = getRateLimiter(`materialize:orders:org:${orgIdHeader}`, 10, 0.167);
    if (!limiter.tryConsume(1))
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    const cfg = await query<any>(
      `SELECT id as connector_id, org_id FROM integration_connector
       WHERE provider = 'woocommerce' AND status::text = 'active'
       ORDER BY created_at DESC LIMIT 1`
    );
    if (!cfg.rows.length)
      return NextResponse.json({ success: false, error: 'No active connector' }, { status: 404 });
    const row = cfg.rows[0];
    if (String(row.org_id) !== String(orgIdHeader))
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    const sync = new IntegrationSyncService(row.connector_id, row.org_id);
    const result = await sync.materializeOrdersFromSync();
    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}
