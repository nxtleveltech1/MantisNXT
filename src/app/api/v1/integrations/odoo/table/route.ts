import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

const VALID = new Set(['products', 'customers', 'orders'])

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const entity = (url.searchParams.get('entity') || '').toLowerCase()
    if (!VALID.has(entity)) {
      return NextResponse.json({ success: false, error: 'Invalid entity' }, { status: 400 })
    }
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1)
    const pageSize = Math.min(Math.max(parseInt(url.searchParams.get('pageSize') || '50', 10), 1), 200)
    const offset = (page - 1) * pageSize

    const countRes = await query(
      `SELECT COUNT(*)::int AS count FROM odoo_sync_queue_line WHERE entity_type = $1`,
      [entity]
    )
    const rowsRes = await query(
      `SELECT external_id, status, data
       FROM odoo_sync_queue_line
       WHERE entity_type = $1
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [entity, pageSize, offset]
    )
    const statusMap: Record<string, string> = {
      pending: 'new',
      processing: 'updated',
      completed: 'in_sync',
      failed: 'deleted',
      skipped: 'deleted',
    }
    const data = rowsRes.rows.map((r: any) => ({ external_id: r.external_id, status: statusMap[r.status] || r.status, raw: r.data }))
    return NextResponse.json({ success: true, data, rowCount: countRes.rows[0]?.count || 0, page, pageSize })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load data' }, { status: 500 })
  }
}