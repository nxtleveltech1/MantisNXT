export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import type { NextRequest } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const uploadId = url.searchParams.get('upload_id')
  const supplierId = url.searchParams.get('supplier_id')

  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()
  let lastId = 0
  let closed = false

  async function pushEvent(ev: unknown) {
    const line = `event: audit\ndata: ${JSON.stringify(ev)}\n\n`
    await writer.write(encoder.encode(line))
  }

  const interval = setInterval(async () => {
    if (closed) return
    const where: string[] = []
    const params: unknown[] = []
    if (uploadId) { where.push(`upload_id = $${params.length + 1}`); params.push(uploadId) }
    if (supplierId) { where.push(`supplier_id = $${params.length + 1}`); params.push(supplierId) }
    let sql = `SELECT id, supplier_id, upload_id, action, status, details, started_at, finished_at
               FROM public.ai_agent_audit`
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += `${where.length ? ' AND' : ' WHERE'} id > $${params.length + 1}`
    params.push(lastId)
    try {
      const res = await query(sql, params)
      for (const row of res.rows) {
        lastId = Math.max(lastId, row.id as number)
        await pushEvent(row)
      }
    } catch {}
  }, 1000)

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })

  request.signal.addEventListener('abort', async () => {
    closed = true
    clearInterval(interval)
    await writer.close()
  })

  return new Response(stream.readable, { headers })
}