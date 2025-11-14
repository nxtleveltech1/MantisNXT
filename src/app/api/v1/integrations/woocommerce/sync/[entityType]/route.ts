import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { WooCommerceService } from '@/lib/services/WooCommerceService'
import { IntegrationSyncService } from '@/lib/services/IntegrationSyncService'
import { createErrorResponse } from '@/lib/utils/neon-error-handler'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ entityType: string }> }
) {
  const { entityType } = await context.params
  try {
    const valid = ['products', 'orders', 'customers', 'categories']
    if (!valid.includes(entityType)) {
      return NextResponse.json({ success: false, error: 'invalid entity type' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const orgIdFromBody = body?.org_id as string | undefined
    const orgIdHeader = request.headers.get('x-org-id') || undefined
    const orgId = orgIdFromBody || orgIdHeader
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'orgId required' }, { status: 400 })
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(orgId)) {
      return NextResponse.json({ success: false, error: 'Invalid organization ID format' }, { status: 400 })
    }

    const cfg = await query<any>(
      `SELECT id as connector_id, org_id, config, status::text as status, last_sync_at
       FROM integration_connector
       WHERE provider = 'woocommerce' AND status::text = 'active' AND org_id = $1
       ORDER BY created_at DESC LIMIT 1`
    , [orgId])
    if (!cfg.rows.length) {
      return NextResponse.json({ success: false, error: 'No active WooCommerce connector' }, { status: 404 })
    }
    const row = cfg.rows[0]
    const connectorId: string = row.connector_id
    const orgIdResolved: string = row.org_id
    const raw = row.config || {}

    const woo = new WooCommerceService({
      url: raw.url || raw.store_url || raw.storeUrl,
      consumerKey: raw.consumerKey || raw.consumer_key,
      consumerSecret: raw.consumerSecret || raw.consumer_secret,
      version: raw.version || 'wc/v3',
      timeout: raw.timeout || 30000,
      verifySsl: raw.verifySsl ?? raw.verify_ssl,
    })
    const sync = new IntegrationSyncService(connectorId, orgIdResolved)

    const ok = await woo.testConnection()
    if (!ok) {
      return NextResponse.json({ success: false, error: 'WooCommerce connection failed' }, { status: 502 })
    }

    const lastSyncAt = row.last_sync_at ? new Date(row.last_sync_at).getTime() : 0
    const now = Date.now()
    if (lastSyncAt && now - lastSyncAt < 30_000) {
      const res = NextResponse.json({ success: false, error: 'Rate limited: please wait before next sync' }, { status: 429 })
      res.headers.set('Retry-After', '30')
      return res
    }

    let result
    if (entityType === 'orders') {
      result = await sync.syncOrdersFromWooCommerce(woo, { continueOnError: true, dryRun: false })
    } else if (entityType === 'products') {
      result = await sync.syncProductsFromWooCommerce(woo, { continueOnError: true, dryRun: false })
    } else if (entityType === 'customers') {
      result = await sync.syncCustomersWithWooCommerce(woo, 'inbound', undefined, { continueOnError: true, dryRun: false })
    } else if (entityType === 'categories') {
      result = await sync.syncCategoriesFromWooCommerce(woo, { continueOnError: true, dryRun: false })
    }

    await query(
      `UPDATE integration_connector
       SET last_sync_at = NOW(), error_message = NULL, retry_count = 0, updated_at = NOW()
       WHERE id = $1`,
      [connectorId]
    )

    const res = NextResponse.json({ success: true, data: result })
    res.headers.set('Server-Timing', `sync;desc="${entityType}"`)
    return res
  } catch (e: any) {
    return createErrorResponse(e, 500)
  }
}
