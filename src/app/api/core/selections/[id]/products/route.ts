/**
 * GET /api/core/selections/[id]/products
 * Returns enriched products for a specific selection (works for draft/active).
 */

import { NextRequest, NextResponse } from 'next/server'
import { query as dbQuery } from '@/lib/database/unified-connection'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: selectionId } = await params

    if (!selectionId) {
      return NextResponse.json(
        { success: false, error: 'selectionId is required' },
        { status: 400 }
      )
    }

    // Build enriched selection product view for this selection id
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
      ),
      latest_stock AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          qty AS qty_on_hand
        FROM core.stock_on_hand
        ORDER BY supplier_product_id, as_of_ts DESC
      )
      SELECT
        isi.selection_id,
        isi.selected_at,
        sp.supplier_product_id,
        sp.supplier_id,
        s.name AS supplier_name,
        s.code AS supplier_code,
        sp.supplier_sku,
        sp.name_from_supplier AS product_name,
        sp.uom,
        sp.pack_size,
        sp.barcode,
        sp.category_id,
        c.name AS category_name,
        cp.price AS current_price,
        cp.currency,
        ls.qty_on_hand,
        (COALESCE(ls.qty_on_hand, 0) > 0) AS is_in_stock
      FROM core.inventory_selected_item isi
      JOIN core.supplier_product sp ON sp.supplier_product_id = isi.supplier_product_id
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
      WHERE isi.selection_id = $1 AND isi.status = 'selected'
      ORDER BY s.name, sp.name_from_supplier
    `

    const result = await dbQuery(sql, [selectionId])
    return NextResponse.json({ success: true, data: result.rows, count: result.rowCount || 0 })
  } catch (error) {
    console.error('[API] selection products error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch selection products' },
      { status: 500 }
    )
  }
}

