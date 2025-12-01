import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRateLimiter } from '@/lib/utils/rate-limiter';
import { IntegrationSyncService } from '@/lib/services/IntegrationSyncService';
import { getActiveWooConnector, resolveWooOrgId } from '@/lib/utils/woocommerce-connector';

export async function POST(request: NextRequest) {
  try {
    const { orgId } = resolveWooOrgId(request);
    if (!orgId)
      return NextResponse.json({ success: false, error: 'orgId required' }, { status: 400 });

    const limiter = getRateLimiter(`materialize:orders:org:${orgId}`, 10, 0.167);
    if (!limiter.tryConsume(1))
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });

    const { connector, orgId: connectorOrgId } = await getActiveWooConnector(orgId);
    if (!connector)
      return NextResponse.json({ success: false, error: 'No active connector' }, { status: 404 });

    const resolvedOrgId = connectorOrgId || connector.org_id || orgId;
    const sync = new IntegrationSyncService(connector.connector_id, resolvedOrgId);
    const result = await sync.materializeOrdersFromSync();
    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}
