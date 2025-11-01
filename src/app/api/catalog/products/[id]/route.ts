import { NextRequest, NextResponse } from 'next/server'
import { query as dbQuery } from '@/lib/database/unified-connection'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = `
      WITH current_prices AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          price,
          currency,
          valid_from
        FROM core.price_history
        WHERE is_current = true
        ORDER BY supplier_product_id, valid_from DESC
      )
      SELECT
        sp.*, s.name AS supplier_name, s.code AS supplier_code,
        c.name AS category_name, cp.price AS current_price, cp.currency
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      WHERE sp.supplier_product_id = $1
      LIMIT 1
    `
    const res = await dbQuery<any>(sql, [id])
    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error) {
    console.error('[API] /api/catalog/products/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 })
  }
}

