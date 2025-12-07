import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { WooCommerceService } from '@/lib/services/WooCommerceService';
import { CustomerSyncService } from '@/lib/services/CustomerSyncService';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { getCircuitBreaker } from '@/lib/utils/rate-limiter';
import jwt from 'jsonwebtoken';
import { getActiveWooConnector, resolveWooOrgId } from '@/lib/utils/woocommerce-connector';

export async function POST(request: NextRequest) {
  try {
    const { orgId } = resolveWooOrgId(request);
    if (!orgId)
      return NextResponse.json({ success: false, error: 'orgId required' }, { status: 400 });

    const isAdminHeader = request.headers.get('x-admin') === 'true';
    let isAdminToken = false;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const secret = process.env.JWT_SECRET || '';
        const payload: any = secret ? jwt.verify(token, secret) : null;
        const role = payload?.role || payload?.roles?.[0] || null;
        isAdminToken = role === 'admin' || payload?.isAdmin === true;
      } catch {}
    }
    if (!isAdminHeader && !isAdminToken) {
      return NextResponse.json({ success: false, error: 'Admin required' }, { status: 403 });
    }

    const { connector, orgId: connectorOrgId } = await getActiveWooConnector(orgId);
    if (!connector)
      return NextResponse.json({ success: false, error: 'No active connector' }, { status: 404 });
    const raw = connector.config || {};
    const config = {
      url: raw.url || raw.store_url || raw.storeUrl,
      consumerKey: raw.consumerKey || raw.consumer_key,
      consumerSecret: raw.consumerSecret || raw.consumer_secret,
      version: raw.version || 'wc/v3',
      timeout: raw.timeout || 30000,
      verifySsl: raw.verifySsl ?? raw.verify_ssl,
    };

    const resolvedOrgId = connectorOrgId || connector.org_id || orgId;

    // Get a valid user ID for the queue (required for foreign key constraint)
    let userId = null;
    const userResult = await query<{ id: string }>(
      `SELECT id FROM "user" WHERE org_id = $1 ORDER BY created_at LIMIT 1`,
      [resolvedOrgId]
    );
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
    } else {
      console.warn(`[WooCommerce Schedule Customers] No users found for org ${resolvedOrgId}, using org ID as fallback`);
      userId = resolvedOrgId; // Fallback for testing
    }

    const breaker = getCircuitBreaker(`woo:customers:${resolvedOrgId}`, 5, 60000);
    const queue = await breaker.execute(async () => {
      const woo = new WooCommerceService(config);
      const ok = await woo.testConnection();
      if (!ok) throw new Error('Connection failed');
      const qid = await CustomerSyncService.startSync(woo, resolvedOrgId, userId, {
        batchSize: 50,
        batchDelayMs: 2000,
        maxRetries: 3,
      });
      setImmediate(async () => {
        await CustomerSyncService.processQueue(woo, qid, resolvedOrgId, {
          batchSize: 50,
          batchDelayMs: 2000,
          maxRetries: 3,
        });
      });
      const status = await CustomerSyncService.getStatus(qid, resolvedOrgId);
      return status;
    });

    return NextResponse.json({ success: true, data: queue });
  } catch (e: any) {
    return createErrorResponse(e, 500);
  }
}
