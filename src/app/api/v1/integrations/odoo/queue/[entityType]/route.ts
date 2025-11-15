import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { OdooService } from '@/lib/services/OdooService'

const VALID = new Set(['products', 'customers', 'orders'])

export async function POST(request: NextRequest, context: { params: Promise<{ entityType: string }> }) {
  try {
    const { entityType } = await context.params
    const entity = entityType.toLowerCase()
    if (!VALID.has(entity)) {
      return NextResponse.json({ success: false, error: 'Invalid entity' }, { status: 400 })
    }
    const orgId = request.headers.get('x-org-id')
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Missing organization' }, { status: 400 })
    }
    const cfgRes = await query(
      `SELECT id, config FROM integration_connector WHERE provider = 'odoo' AND status::text = 'active' ORDER BY updated_at DESC LIMIT 1`
    )
    if (!cfgRes.rows.length) {
      return NextResponse.json({ success: false, error: 'No active Odoo connector' }, { status: 404 })
    }
    const c = cfgRes.rows[0].config
    const svc = new OdooService({ url: String(c.server_url).replace(/\/$/, ''), database: String(c.database_name), username: String(c.username), password: String(c.api_key) })
    const map: Record<string, { model: string; fields: string[] }> = {
      products: { model: 'product.template', fields: ['id', 'name', 'default_code', 'list_price', 'standard_price'] },
      customers: { model: 'res.partner', fields: ['id', 'name', 'email', 'phone', 'customer_rank'] },
      orders: { model: 'sale.order', fields: ['id', 'name', 'partner_id', 'amount_total', 'state'] },
    }
    const { model, fields } = map[entity]
    const records = await svc.searchRead(model, { fields, limit: 500 })
    const queueName = `${entity}-${Date.now()}`
    const res = await query(
      `SELECT public.odoo_queue_create_and_fill($1, $2::uuid, $3, $4::jsonb) AS result`,
      [entity, orgId, queueName, JSON.stringify(records)]
    )
    return NextResponse.json({ success: true, data: res.rows[0]?.result || {} })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Queue staging failed' }, { status: 500 })
  }
}