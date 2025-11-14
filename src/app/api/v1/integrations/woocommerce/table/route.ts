import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getRateLimiter } from '@/lib/utils/rate-limiter'
import { createErrorResponse } from '@/lib/utils/neon-error-handler'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const entity = url.searchParams.get('entity') || 'products'
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50', 10), 100)
  const orgId = url.searchParams.get('orgId') || undefined
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const limiter = getRateLimiter(`table:${entity}:org:${orgId}`, 30, 0.5)
  if (!limiter.tryConsume(1)) {
    const res = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    res.headers.set('Retry-After', '30')
    return res
  }

  const valid = ['products', 'customers', 'orders', 'categories']
  if (!valid.includes(entity)) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 })
  }

  const offset = (page - 1) * pageSize
  const typeMap: Record<string, string> = {
    products: 'product',
    customers: 'customer',
    orders: 'order',
    categories: 'category',
  }
  const entityType = typeMap[entity]

  const baseSql = `
    SELECT s.external_id,
           s.sync_data,
           s.last_sync_status,
           p.delta_data
    FROM woocommerce_sync s
    LEFT JOIN sync_preview_cache p
      ON p.org_id = s.org_id AND p.sync_type::text = 'woocommerce' AND p.entity_type::text = '${entity}'
    WHERE s.entity_type::text = '${entityType}'
    AND s.org_id = $1
    ORDER BY s.updated_at DESC
    LIMIT $2 OFFSET $3
  `

  const params: unknown[] = []
  params.push(orgId)
  params.push(pageSize, offset)

  const rows = await query<any>(baseSql, params)

  const data = rows.rows.map((r: any) => {
    const delta = r.delta_data || {}
    const d = delta?.inbound || delta?.bidirectional || delta?.outbound || {}
    const byId = d.byId || {}
    const status = byId?.[r.external_id]?.status || 'in_sync'
    const raw = r.sync_data || {}
    const display = (() => {
      if (entity === 'products') return { name: raw.name, sku: raw.sku }
      if (entity === 'customers') return { email: raw.email, name: `${raw.first_name || ''} ${raw.last_name || ''}`.trim() }
      if (entity === 'orders') return { order_number: raw.number, status: raw.status }
      if (entity === 'categories') return { name: raw.name, slug: raw.slug }
      return {}
    })()
    return { external_id: r.external_id, status, display, raw }
  })

  return NextResponse.json({ data, rowCount: rows.rowCount, page, pageSize })
}
export async function POST() {
  return createErrorResponse(new Error('Method Not Allowed'), 405)
}
