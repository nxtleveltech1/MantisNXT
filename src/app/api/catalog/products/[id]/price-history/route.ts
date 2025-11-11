import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { query as dbQuery } from '@/lib/database/unified-connection'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '50', 10), 200)
    const sql = `
      SELECT price, currency, valid_from, valid_to, is_current
      FROM core.price_history
      WHERE supplier_product_id = $1
      ORDER BY valid_from DESC
      LIMIT $2
    `
    const res = await dbQuery(sql, [id, limit])
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error) {
    console.error('[API] /api/catalog/products/[id]/price-history error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch price history' }, { status: 500 })
  }
}

