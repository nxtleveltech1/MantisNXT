import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';

interface ExportRow {
  supplier_name: string;
  supplier_sku: string;
  product_name: string;
  brand: string | null;
  series_range: string | null;
  category_name: string | null;
  tags: Array<{ name: string }> | string;
  sup_soh: number | null;
  stock_status: string | null;
  new_stock_eta: string | null;
  qty_on_order: number | null;
  cost_ex_vat: number | null;
  base_discount: number | null;
  cost_after_discount: number | null;
  rsp: number | null;
  cost_inc_vat: number | null;
  currency: string | null;
  previous_cost: number | null;
  cost_diff: number | null;
  is_active: boolean;
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

function formatTags(tags: unknown): string {
  if (!tags) return '';
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed.map((t: { name?: string }) => t.name || '').filter(Boolean).join(', ');
      }
    } catch {
      return '';
    }
  }
  if (Array.isArray(tags)) {
    return tags.map((t: { name?: string }) => t.name || '').filter(Boolean).join(', ');
  }
  return '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierIds = searchParams.getAll('supplier_id');
    const categoryIds = searchParams.getAll('category_id');
    const categoryRaw = searchParams.getAll('category_raw');
    const brandFilters = searchParams.getAll('brand');
    const search = searchParams.get('search') || undefined;
    const isActiveParam = searchParams.get('is_active');
    const isActive = isActiveParam === null ? undefined : isActiveParam === 'true';
    const priceMin = searchParams.get('price_min')
      ? Number(searchParams.get('price_min'))
      : undefined;
    const priceMax = searchParams.get('price_max')
      ? Number(searchParams.get('price_max'))
      : undefined;
    const sortBy = (searchParams.get('sort_by') || 'supplier_name') as string;
    const sortDir = (
      (searchParams.get('sort_dir') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'
    ) as 'asc' | 'desc';

    // Build WHERE conditions
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    if (supplierIds && supplierIds.length > 0) {
      conditions.push(`sp.supplier_id = ANY($${idx++}::uuid[])`);
      params.push(supplierIds);
    }
    const hasCategoryIdFilter = categoryIds && categoryIds.length > 0;
    const hasCategoryRawFilter = categoryRaw && categoryRaw.length > 0;
    const hasBrandFilter = brandFilters && brandFilters.length > 0;

    if (hasCategoryIdFilter && hasCategoryRawFilter) {
      conditions.push(
        `(sp.category_id = ANY($${idx}::uuid[]) OR cat.category_raw = ANY($${idx + 1}::text[]))`
      );
      params.push(categoryIds);
      params.push(categoryRaw);
      idx += 2;
    } else if (hasCategoryIdFilter) {
      conditions.push(`sp.category_id = ANY($${idx++}::uuid[])`);
      params.push(categoryIds);
    } else if (hasCategoryRawFilter) {
      conditions.push(`cat.category_raw = ANY($${idx++}::text[])`);
      params.push(categoryRaw);
    }
    if (hasBrandFilter) {
      conditions.push(`COALESCE(br.brand, sp.attrs_json->>'brand') = ANY($${idx++}::text[])`);
      params.push(brandFilters);
    }
    if (typeof isActive === 'boolean') {
      conditions.push(`sp.is_active = $${idx++}`);
      params.push(isActive);
    }
    if (search) {
      conditions.push(`(sp.name_from_supplier ILIKE $${idx} OR sp.supplier_sku ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (typeof priceMin === 'number' && !Number.isNaN(priceMin)) {
      conditions.push(`COALESCE(cp.price, 0) >= $${idx++}`);
      params.push(priceMin);
    }
    if (typeof priceMax === 'number' && !Number.isNaN(priceMax)) {
      conditions.push(`COALESCE(cp.price, 0) <= $${idx++}`);
      params.push(priceMax);
    }

    const whereSql = conditions.join(' AND ');

    // Whitelist sort columns
    const sortColumn =
      sortBy === 'supplier_sku'
        ? 'sp.supplier_sku'
        : sortBy === 'product_name'
          ? 'sp.name_from_supplier'
          : sortBy === 'category_name'
            ? 'c.name'
            : sortBy === 'current_price'
              ? 'cp.price'
              : sortBy === 'first_seen_at'
                ? 'sp.first_seen_at'
                : sortBy === 'last_seen_at'
                  ? 'sp.last_seen_at'
                  : sortBy === 'stock_status'
                    ? 'sp.stock_status'
                    : sortBy === 'new_stock_eta'
                      ? 'sp.new_stock_eta'
                      : 's.name';

    // Export query - no pagination limit
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
      previous_prices AS (
        SELECT DISTINCT ON (ph.supplier_product_id)
          ph.supplier_product_id,
          ph.price AS previous_price
        FROM core.price_history ph
        JOIN current_prices cp ON cp.supplier_product_id = ph.supplier_product_id
        WHERE ph.is_current = false
          AND ph.valid_to <= cp.valid_from
        ORDER BY ph.supplier_product_id, ph.valid_to DESC
      ),
      latest_stock AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          qty AS qty_on_hand
        FROM core.stock_on_hand
        ORDER BY supplier_product_id, as_of_ts DESC
      ),
      product_tags AS (
        SELECT 
          ata.supplier_product_id,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'tag_id', ata.tag_id,
                'name', COALESCE(tl.name, ata.tag_id),
                'type', COALESCE(tl.type, 'auto'),
                'assigned_at', ata.assigned_at,
                'assigned_by', ata.assigned_by
              )
              ORDER BY COALESCE(tl.name, ata.tag_id), ata.tag_id
            ) FILTER (WHERE ata.tag_id IS NOT NULL),
            '[]'::jsonb
          ) AS tags
        FROM core.ai_tag_assignment ata
        LEFT JOIN core.ai_tag_library tl ON tl.tag_id = ata.tag_id
        GROUP BY ata.supplier_product_id
      ),
      supplier_discounts AS (
        SELECT 
          sp.supplier_product_id,
          COALESCE(
            (SELECT dr.discount_percent 
             FROM core.supplier_discount_rules dr
             WHERE dr.supplier_id = sp.supplier_id
               AND dr.scope_type = 'sku'
               AND dr.supplier_sku = sp.supplier_sku
               AND dr.is_active = true
               AND dr.valid_from <= NOW()
               AND (dr.valid_until IS NULL OR dr.valid_until >= NOW())
             ORDER BY dr.priority DESC
             LIMIT 1),
            -- Brand-level discount (match by brand name from attrs_json or pricelist_row)
            (SELECT dr.discount_percent 
             FROM core.supplier_discount_rules dr
             JOIN public.brand b ON b.id = dr.brand_id
             WHERE dr.supplier_id = sp.supplier_id
               AND dr.scope_type = 'brand'
               AND UPPER(TRIM(b.name)) = UPPER(TRIM(COALESCE(
                 sp.attrs_json->>'brand',
                 (SELECT r.brand 
                  FROM spp.pricelist_row r
                  JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
                  WHERE r.supplier_sku = sp.supplier_sku AND r.brand IS NOT NULL AND r.brand <> ''
                  ORDER BY u.received_at DESC, r.row_num DESC
                  LIMIT 1),
                 ''
               )))
               AND dr.is_active = true
               AND dr.valid_from <= NOW()
               AND (dr.valid_until IS NULL OR dr.valid_until >= NOW())
             ORDER BY dr.priority DESC
             LIMIT 1),
            (SELECT dr.discount_percent 
             FROM core.supplier_discount_rules dr
             WHERE dr.supplier_id = sp.supplier_id
               AND dr.scope_type = 'category'
               AND dr.category_id = sp.category_id
               AND dr.is_active = true
               AND dr.valid_from <= NOW()
               AND (dr.valid_until IS NULL OR dr.valid_until >= NOW())
             ORDER BY dr.priority DESC
             LIMIT 1),
            (SELECT dr.discount_percent 
             FROM core.supplier_discount_rules dr
             WHERE dr.supplier_id = sp.supplier_id
               AND dr.scope_type = 'supplier'
               AND dr.is_active = true
               AND dr.valid_from <= NOW()
               AND (dr.valid_until IS NULL OR dr.valid_until >= NOW())
             ORDER BY dr.priority DESC
             LIMIT 1),
            s.base_discount_percent,
            (sp.attrs_json->>'base_discount')::numeric,
            (sprof.guidelines->'pricing'->>'discount_percentage')::numeric,
            0
          ) AS base_discount
        FROM core.supplier_product sp
        JOIN core.supplier s ON s.supplier_id = sp.supplier_id
        LEFT JOIN public.supplier_profiles sprof ON sprof.supplier_id = sp.supplier_id 
          AND sprof.profile_name = 'default' 
          AND sprof.is_active = true
      )
      SELECT
        s.name AS supplier_name,
        sp.supplier_sku,
        sp.name_from_supplier AS product_name,
        COALESCE(br.brand, sp.attrs_json->>'brand') AS brand,
        sr.series_range,
        CASE WHEN c.name IS NOT NULL AND c.name <> '' THEN c.name ELSE cat.category_raw END AS category_name,
        COALESCE(pt.tags, '[]'::jsonb) AS tags,
        COALESCE(
          (sp.attrs_json->>'stock_quantity')::int,
          ls.qty_on_hand
        ) AS sup_soh,
        COALESCE(
          sp.stock_status,
          sp.attrs_json->>'stock_status',
          pls.stock_status
        ) AS stock_status,
        COALESCE(
          sp.new_stock_eta,
          (sp.attrs_json->>'new_stock_eta')::date,
          pls.eta
        ) AS new_stock_eta,
        COALESCE(
          (sp.attrs_json->>'qty_on_order')::int,
          qty.qty_on_order
        ) AS qty_on_order,
        COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL) AS cost_ex_vat,
        COALESCE(sd.base_discount, 0) AS base_discount,
        CASE
          WHEN COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL) IS NOT NULL 
            AND COALESCE(sd.base_discount, 0) > 0
          THEN COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL) * 
               (1 - COALESCE(sd.base_discount, 0) / 100)
          ELSE COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL)
        END AS cost_after_discount,
        COALESCE((sp.attrs_json->>'rsp')::numeric, NULL) AS rsp,
        CASE
          WHEN COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL) IS NOT NULL 
          THEN (
            CASE
              WHEN COALESCE(sd.base_discount, 0) > 0
              THEN COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL) * 
                   (1 - COALESCE(sd.base_discount, 0) / 100)
              ELSE COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL)
            END
          ) * 1.15
          ELSE NULL
        END AS cost_inc_vat,
        cp.currency,
        pp.previous_price AS previous_cost,
        CASE
          WHEN pp.previous_price IS NOT NULL 
            AND COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price) IS NOT NULL
          THEN COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price) - pp.previous_price
          ELSE NULL
        END AS cost_diff,
        sp.is_active
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      LEFT JOIN previous_prices pp ON pp.supplier_product_id = sp.supplier_product_id
      LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
      LEFT JOIN product_tags pt ON pt.supplier_product_id = sp.supplier_product_id
      LEFT JOIN supplier_discounts sd ON sd.supplier_product_id = sp.supplier_product_id
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
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          r.attrs_json->>'seriesRange',
          r.attrs_json->>'series_range',
          r.attrs_json->>'series',
          r.attrs_json->>'range'
        ) AS series_range
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
        WHERE r.supplier_sku = sp.supplier_sku
          AND (
            r.attrs_json->>'seriesRange' IS NOT NULL OR
            r.attrs_json->>'series_range' IS NOT NULL OR
            r.attrs_json->>'series' IS NOT NULL OR
            r.attrs_json->>'range' IS NOT NULL
          )
        ORDER BY u.received_at DESC, r.row_num DESC
        LIMIT 1
      ) sr ON TRUE
      LEFT JOIN LATERAL (
        SELECT r.stock_status, r.eta
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
        WHERE r.supplier_sku = sp.supplier_sku
          AND (r.stock_status IS NOT NULL OR r.eta IS NOT NULL)
        ORDER BY u.received_at DESC, r.row_num DESC
        LIMIT 1
      ) pls ON TRUE
      WHERE ${whereSql}
      ORDER BY ${sortColumn} ${sortDir}
    `;

    let rows: ExportRow[] = [];
    
    try {
      const dataRes = await dbQuery<ExportRow>(dataSql, params);
      rows = dataRes.rows;
    } catch (primaryErr) {
      console.warn(
        '[API] /api/catalog/products/export primary query failed, attempting fallback:',
        primaryErr
      );

      // Fallback query without price_history and stock_on_hand CTEs
      const sortColumnFallback =
        sortBy === 'supplier_sku'
          ? 'sp.supplier_sku'
          : sortBy === 'product_name'
            ? 'sp.name_from_supplier'
            : sortBy === 'category_name'
              ? 'c.name'
              : sortBy === 'first_seen_at'
                ? 'sp.first_seen_at'
                : sortBy === 'last_seen_at'
                  ? 'sp.last_seen_at'
                  : 's.name';

      const fallbackSql = `
        SELECT
          s.name AS supplier_name,
          sp.supplier_sku,
          sp.name_from_supplier AS product_name,
          COALESCE(br.brand, sp.attrs_json->>'brand') AS brand,
          NULL::text AS series_range,
          CASE WHEN c.name IS NOT NULL AND c.name <> '' THEN c.name ELSE cat.category_raw END AS category_name,
          '[]'::jsonb AS tags,
          COALESCE((sp.attrs_json->>'stock_quantity')::int, NULL) AS sup_soh,
          COALESCE(sp.stock_status, sp.attrs_json->>'stock_status') AS stock_status,
          COALESCE(sp.new_stock_eta, (sp.attrs_json->>'new_stock_eta')::date) AS new_stock_eta,
          COALESCE((sp.attrs_json->>'qty_on_order')::int, NULL) AS qty_on_order,
          COALESCE((sp.attrs_json->>'cost_excluding')::numeric, NULL) AS cost_ex_vat,
          COALESCE((sp.attrs_json->>'base_discount')::numeric, 0) AS base_discount,
          COALESCE((sp.attrs_json->>'cost_excluding')::numeric, NULL) AS cost_after_discount,
          COALESCE((sp.attrs_json->>'rsp')::numeric, NULL) AS rsp,
          COALESCE((sp.attrs_json->>'cost_including')::numeric, NULL) AS cost_inc_vat,
          'ZAR'::text AS currency,
          NULL::numeric AS previous_cost,
          NULL::numeric AS cost_diff,
          sp.is_active
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
        WHERE ${whereSql}
        ORDER BY ${sortColumnFallback} ${sortDir}
      `;
      
      const fallbackRes = await dbQuery<ExportRow>(fallbackSql, params);
      rows = fallbackRes.rows;
    }
    
    console.log(`[API] /api/catalog/products/export - Exporting ${rows.length} rows`);

    // Build CSV content
    const headers = [
      'Supplier',
      'SKU',
      'Product Name',
      'Brand',
      'Series/Range',
      'Category',
      'Tags',
      'SOH',
      'Stock Status',
      'New Stock ETA',
      'Stock on Order',
      'Cost ExVAT',
      'Base Discount %',
      'Cost After Discount',
      'RSP',
      'Cost IncVAT',
      'Currency',
      'Previous Cost',
      'Cost Diff',
      'Active',
    ];

    const csvRows = rows.map((row) => [
      escapeCSV(row.supplier_name),
      escapeCSV(row.supplier_sku),
      escapeCSV(row.product_name),
      escapeCSV(row.brand),
      escapeCSV(row.series_range),
      escapeCSV(row.category_name),
      escapeCSV(formatTags(row.tags)),
      escapeCSV(formatNumber(row.sup_soh)),
      escapeCSV(row.stock_status),
      escapeCSV(row.new_stock_eta ? new Date(row.new_stock_eta).toLocaleDateString() : ''),
      escapeCSV(formatNumber(row.qty_on_order)),
      escapeCSV(formatNumber(row.cost_ex_vat)),
      escapeCSV(formatNumber(row.base_discount)),
      escapeCSV(formatNumber(row.cost_after_discount)),
      escapeCSV(formatNumber(row.rsp)),
      escapeCSV(formatNumber(row.cost_inc_vat)),
      escapeCSV(row.currency || 'ZAR'),
      escapeCSV(formatNumber(row.previous_cost)),
      escapeCSV(formatNumber(row.cost_diff)),
      escapeCSV(row.is_active ? 'Yes' : 'No'),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((row) => row.join(',')),
    ].join('\r\n');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const supplierName = supplierIds.length === 1 
      ? (rows[0]?.supplier_name || 'supplier').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      : 'all-suppliers';
    const filename = `supplier-inventory-${supplierName}-${date}.csv`;

    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    // Return CSV file with proper headers to force download
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[API] /api/catalog/products/export error:', errorMessage, errorStack);
    return NextResponse.json(
      { success: false, error: `Export failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

