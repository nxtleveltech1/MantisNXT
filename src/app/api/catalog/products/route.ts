import { NextRequest, NextResponse } from 'next/server'
import { query as dbQuery } from '@/lib/database/unified-connection'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierIds = searchParams.getAll('supplier_id')
    const categoryIds = searchParams.getAll('category_id')
    const categoryRaw = searchParams.getAll('category_raw')
    const search = searchParams.get('search') || undefined
    const isActiveParam = searchParams.get('is_active')
    const isActive = isActiveParam === null ? undefined : isActiveParam === 'true'
    const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined
    const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined
    const sortBy = (searchParams.get('sort_by') || 'supplier_name') as string
    const sortDir = ((searchParams.get('sort_dir') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const offset = (page - 1) * limit

    const conditions: string[] = ['1=1']
    const params: any[] = []
    let idx = 1

    if (supplierIds && supplierIds.length > 0) {
      conditions.push(`sp.supplier_id = ANY($${idx++}::uuid[])`)
      params.push(supplierIds)
    }
    const hasCategoryIdFilter = categoryIds && categoryIds.length > 0
    const hasCategoryRawFilter = categoryRaw && categoryRaw.length > 0

    if (hasCategoryIdFilter && hasCategoryRawFilter) {
      conditions.push(`(sp.category_id = ANY($${idx}::uuid[]) OR cat.category_raw = ANY($${idx + 1}::text[]))`)
      params.push(categoryIds)
      params.push(categoryRaw)
      idx += 2
    } else if (hasCategoryIdFilter) {
      conditions.push(`sp.category_id = ANY($${idx++}::uuid[])`)
      params.push(categoryIds)
    } else if (hasCategoryRawFilter) {
      conditions.push(`cat.category_raw = ANY($${idx++}::text[])`)
      params.push(categoryRaw)
    }
    if (typeof isActive === 'boolean') {
      conditions.push(`sp.is_active = $${idx++}`)
      params.push(isActive)
    }
    if (search) {
      conditions.push(`(sp.name_from_supplier ILIKE $${idx} OR sp.supplier_sku ILIKE $${idx})`)
      params.push(`%${search}%`)
      idx++
    }
    if (typeof priceMin === 'number' && !Number.isNaN(priceMin)) {
      conditions.push(`COALESCE(cp.price, 0) >= $${idx++}`)
      params.push(priceMin)
    }
    if (typeof priceMax === 'number' && !Number.isNaN(priceMax)) {
      conditions.push(`COALESCE(cp.price, 0) <= $${idx++}`)
      params.push(priceMax)
    }

    const whereSql = conditions.join(' AND ')

    const needsJoinsForCount = hasCategoryRawFilter || (typeof priceMin === 'number' || typeof priceMax === 'number')
    let total = 0
    if (needsJoinsForCount) {
      const countSql = `
        WITH current_prices AS (
          SELECT DISTINCT ON (supplier_product_id)
            supplier_product_id,
            price
          FROM core.price_history
          WHERE is_current = true
          ORDER BY supplier_product_id, valid_from DESC
        )
        SELECT COUNT(*)::int AS total
        FROM core.supplier_product sp
        LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
        LEFT JOIN LATERAL (
          SELECT r.category_raw
          FROM spp.pricelist_row r
          JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
          WHERE r.supplier_sku = sp.supplier_sku AND r.category_raw IS NOT NULL AND r.category_raw <> ''
          ORDER BY u.received_at DESC, r.row_num DESC
          LIMIT 1
        ) cat ON TRUE
        WHERE ${whereSql}
      `
      const countRes = await dbQuery<{ total: number }>(countSql, params)
      total = countRes.rows[0]?.total || 0
    } else {
      const countSql = `
        SELECT COUNT(*)::int AS total
        FROM core.supplier_product sp
        WHERE ${whereSql}
      `
      const countRes = await dbQuery<{ total: number }>(countSql, params)
      total = countRes.rows[0]?.total || 0
    }

    // Whitelist sort columns
    const sortColumn =
      sortBy === 'supplier_sku' ? 'sp.supplier_sku' :
      sortBy === 'product_name' ? 'sp.name_from_supplier' :
      sortBy === 'category_name' ? 'c.name' :
      sortBy === 'current_price' ? 'cp.price' :
      sortBy === 'first_seen_at' ? 'sp.first_seen_at' :
      sortBy === 'last_seen_at' ? 'sp.last_seen_at' :
      's.name';

    const dataSql = `
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
        sp.supplier_product_id,
        sp.supplier_id,
        s.name AS supplier_name,
        s.code AS supplier_code,
        sp.supplier_sku,
        sp.name_from_supplier AS product_name,
        br.brand AS brand,
        sp.uom,
        sp.pack_size,
        sp.barcode,
        sp.category_id,
        COALESCE(cat.category_raw, c.name) AS category_name,
        sp.is_active,
        sp.first_seen_at,
        sp.last_seen_at,
        cp.price AS current_price,
        cp.currency,
        ls.qty_on_hand,
        qty.qty_on_order
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
      LEFT JOIN LATERAL (
        SELECT r.brand
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
        WHERE r.supplier_sku = sp.supplier_sku AND r.brand IS NOT NULL AND r.brand <> ''
        ORDER BY u.received_at DESC, r.row_num DESC
        LIMIT 1
      ) br ON TRUE
      LEFT JOIN LATERAL (
        SELECT r.category_raw
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
        WHERE r.supplier_sku = sp.supplier_sku AND r.category_raw IS NOT NULL AND r.category_raw <> ''
        ORDER BY u.received_at DESC, r.row_num DESC
        LIMIT 1
      ) cat ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE((r.attrs_json->>'qty_on_order')::int, NULL) AS qty_on_order
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
        WHERE r.supplier_sku = sp.supplier_sku
        ORDER BY u.received_at DESC, r.row_num DESC
        LIMIT 1
      ) qty ON TRUE
      WHERE ${whereSql}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT $${idx++} OFFSET $${idx}
    `

    const dataParams = [...params, limit, offset]
    let dataRows: any[] = []
    try {
      const dataRes = await dbQuery<any>(dataSql, dataParams)
      dataRows = dataRes.rows
    } catch (primaryErr) {
      console.warn('[API] /api/catalog/products primary query failed, attempting fallback without optional tables:', primaryErr)

      // Fallback query without price_history and stock_on_hand if those relations are unavailable
      const sortColumnFallback =
        sortBy === 'supplier_sku' ? 'sp.supplier_sku' :
        sortBy === 'product_name' ? 'sp.name_from_supplier' :
        sortBy === 'category_name' ? 'c.name' :
        sortBy === 'first_seen_at' ? 'sp.first_seen_at' :
        sortBy === 'last_seen_at' ? 'sp.last_seen_at' :
        's.name';

      const fallbackSql = `
        SELECT
          sp.supplier_product_id,
          sp.supplier_id,
          s.name AS supplier_name,
          s.code AS supplier_code,
          sp.supplier_sku,
          sp.name_from_supplier AS product_name,
          br.brand AS brand,
          sp.uom,
          sp.pack_size,
          sp.barcode,
          sp.category_id,
          COALESCE(cat.category_raw, c.name) AS category_name,
          sp.is_active,
          sp.first_seen_at,
          sp.last_seen_at,
          NULL::numeric AS current_price,
          NULL::text AS currency,
          NULL::int AS qty_on_hand,
          qty.qty_on_order
        FROM core.supplier_product sp
        JOIN core.supplier s ON s.supplier_id = sp.supplier_id
        LEFT JOIN core.category c ON c.category_id = sp.category_id
        LEFT JOIN LATERAL (
          SELECT r.brand
          FROM spp.pricelist_row r
          JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
          WHERE r.supplier_sku = sp.supplier_sku AND r.brand IS NOT NULL AND r.brand <> ''
          ORDER BY u.received_at DESC, r.row_num DESC
          LIMIT 1
        ) br ON TRUE
        LEFT JOIN LATERAL (
          SELECT r.category_raw
          FROM spp.pricelist_row r
          JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
          WHERE r.supplier_sku = sp.supplier_sku AND r.category_raw IS NOT NULL AND r.category_raw <> ''
          ORDER BY u.received_at DESC, r.row_num DESC
          LIMIT 1
        ) cat ON TRUE
        LEFT JOIN LATERAL (
          SELECT COALESCE((r.attrs_json->>'qty_on_order')::int, NULL) AS qty_on_order
          FROM spp.pricelist_row r
          JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
          WHERE r.supplier_sku = sp.supplier_sku
          ORDER BY u.received_at DESC, r.row_num DESC
          LIMIT 1
        ) qty ON TRUE
        WHERE ${whereSql}
        ORDER BY ${sortColumnFallback} ${sortDir}
        LIMIT $${idx - 1} OFFSET $${idx}
      `
      const fallbackRes = await dbQuery<any>(fallbackSql, dataParams)
      dataRows = fallbackRes.rows
    }

    return NextResponse.json({
      success: true,
      data: dataRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[API] /api/catalog/products error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch catalog' },
      { status: 500 }
    )
  }
}
