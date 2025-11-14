import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const orgId = String(request.headers.get('x-org-id') || '').trim()
    if (!orgId) return NextResponse.json({ success: false, error: 'Missing organization' }, { status: 400 })
    const res = await query(`SELECT public.sync_queue_status($1) AS status`, [orgId])
    return NextResponse.json({ success: true, data: res.rows[0]?.status || {} })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to get queue status' }, { status: 500 })
  }
}

