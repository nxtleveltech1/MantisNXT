import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const entity = String(body.entity || '').toLowerCase()
    const ids = Array.isArray(body.ids) ? body.ids.map((x: unknown) => String(x)) : []
    const selected = Boolean(body.selected)
    const user = String(body.user || request.headers.get('x-user-id') || '').trim()
    if (!entity || !ids.length || !user) {
      return NextResponse.json({ success: false, error: 'Invalid selection request' }, { status: 400 })
    }
    const res = await query(`SELECT public.odoo_queue_select($1, $2::text[], $3, $4::uuid) AS updated`, [entity, ids, selected, user])
    return NextResponse.json({ success: true, data: { updated: res.rows[0]?.updated || 0 } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Selection update failed' }, { status: 500 })
  }
}

