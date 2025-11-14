import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createErrorResponse } from '@/lib/utils/neon-error-handler'

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get('x-org-id') || ''
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(orgId)) return NextResponse.json({ success: false, error: 'orgId required' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const entity = (body?.entity || '').toString()
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map((v: unknown) => String(v)) : []
    const selected = body?.selected === true

    const valid = ['customers', 'products', 'orders', 'categories']
    if (!valid.includes(entity)) return NextResponse.json({ success: false, error: 'invalid entity' }, { status: 400 })
    if (!ids.length) return NextResponse.json({ success: false, error: 'ids required' }, { status: 400 })

    const existing = await query<any>(
      `SELECT config FROM sync_selective_config WHERE org_id = $1 AND entity_type::text = $2 LIMIT 1`,
      [orgId, entity]
    )
    const cfg = existing.rows[0]?.config || {}
    const inbound = cfg.inbound || {}
    inbound.selectedIds = selected ? ids : []
    const newCfg = { ...cfg, inbound }

    await query(
      `INSERT INTO sync_selective_config (org_id, entity_type, config, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (org_id, entity_type)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [orgId, entity, JSON.stringify(newCfg)]
    )

    return NextResponse.json({ success: true, data: { entity, selectedCount: inbound.selectedIds.length } })
  } catch (e: any) {
    return createErrorResponse(e, 500)
  }
}
