import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get('orgId') || undefined
    const limit = 100

    const rows = await query<any>(
      `SELECT id, org_id, entity_type::text as entity_type, sync_status::text as status,
              operation, records_affected, started_at, completed_at,
              COALESCE(error_details::text, '') as error_message
       FROM sync_log
       ${orgId ? 'WHERE org_id = $1' : ''}
       ORDER BY started_at DESC
       LIMIT ${limit}`,
      orgId ? [orgId] : []
    )

    return NextResponse.json({ data: rows.rows, rowCount: rows.rowCount })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
