import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { WooCommerceService } from '@/lib/services/WooCommerceService'
import { CustomerSyncService } from '@/lib/services/CustomerSyncService'
import { createErrorResponse } from '@/lib/utils/neon-error-handler'
import { getCircuitBreaker } from '@/lib/utils/rate-limiter'
import { query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get('x-org-id') || ''
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(orgId)) return NextResponse.json({ success: false, error: 'orgId required' }, { status: 400 })

    const isAdmin = request.headers.get('x-admin') === 'true'
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Admin required' }, { status: 403 })

    // Resolve connector config from DB (no secrets exposure client-side)
    const cfg = await query<any>(
      `SELECT id as connector_id, org_id, config
       FROM integration_connector
       WHERE provider = 'woocommerce' AND status::text = 'active' AND org_id = $1
       ORDER BY created_at DESC LIMIT 1`, [orgId]
    )
    if (!cfg.rows.length) return NextResponse.json({ success: false, error: 'No active connector' }, { status: 404 })
    const raw = cfg.rows[0].config || {}
    const config = {
      url: raw.url || raw.store_url || raw.storeUrl,
      consumerKey: raw.consumerKey || raw.consumer_key,
      consumerSecret: raw.consumerSecret || raw.consumer_secret,
      version: raw.version || 'wc/v3',
      timeout: raw.timeout || 30000,
      verifySsl: raw.verifySsl ?? raw.verify_ssl,
    }

    const breaker = getCircuitBreaker(`woo:customers:${orgId}`, 5, 60000)
    const queue = await breaker.execute(async () => {
      const woo = new WooCommerceService(config)
      const ok = await woo.testConnection()
      if (!ok) throw new Error('Connection failed')
      const qid = await CustomerSyncService.startSync(woo, orgId, orgId, { batchSize: 50, batchDelayMs: 2000, maxRetries: 3 })
      setImmediate(async () => {
        await CustomerSyncService.processQueue(woo, qid, orgId, { batchSize: 50, batchDelayMs: 2000, maxRetries: 3 })
      })
      const status = await CustomerSyncService.getStatus(qid, orgId)
      return status
    })

    return NextResponse.json({ success: true, data: queue })
  } catch (e: any) {
    return createErrorResponse(e, 500)
  }
}
