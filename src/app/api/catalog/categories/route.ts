import { NextResponse } from 'next/server'
import { query as dbQuery } from '@/lib/database/unified-connection'

export async function GET() {
  try {
    // Core categories
    const coreRes = await dbQuery<{ category_id: string; name: string }>(
      'SELECT category_id, name FROM core.category ORDER BY name'
    )

    // Raw categories from uploads (distinct non-empty)
    const rawRes = await dbQuery<{ id: string; name: string }>(
      `SELECT DISTINCT 'raw:' || r.category_raw AS id, r.category_raw AS name
       FROM spp.pricelist_row r
       WHERE r.category_raw IS NOT NULL AND r.category_raw <> ''
       ORDER BY r.category_raw`
    )

    // Combine and de-duplicate by id
    const coreList = coreRes.rows.map(r => ({ id: r.category_id, category_id: r.category_id, name: r.name, source: 'core' as const }))
    const rawList = rawRes.rows.map(r => ({ id: r.id, category_id: null as any, name: r.name, source: 'raw' as const }))

    // De-duplicate by name (case-insensitive), preferring core entries over raw
    const seenByName = new Map<string, any>()
    for (const item of coreList) {
      const key = item.name?.toLowerCase().trim() || ''
      if (key && !seenByName.has(key)) seenByName.set(key, item)
    }
    for (const item of rawList) {
      const key = item.name?.toLowerCase().trim() || ''
      if (key && !seenByName.has(key)) seenByName.set(key, item)
    }
    const all = Array.from(seenByName.values())

    return NextResponse.json({ success: true, data: all })
  } catch (error) {
    console.error('[API] /api/catalog/categories error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}
