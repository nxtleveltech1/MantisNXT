/**
 * GET /api/core/selections/[id]/products
 * Returns enriched products for a specific selection (works for draft/active).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: selectionId } = await params;

    if (!selectionId) {
      return NextResponse.json(
        { success: false, error: 'selectionId is required' },
        { status: 400 }
      );
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
            -- Priority order: SKU > Brand > Category > Supplier (base discount)
            -- SKU-level discount
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
            -- Category-level discount
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
            -- Supplier-level discount rule
            (SELECT dr.discount_percent 
             FROM core.supplier_discount_rules dr
             WHERE dr.supplier_id = sp.supplier_id
               AND dr.scope_type = 'supplier'
               AND dr.is_active = true
               AND dr.valid_from <= NOW()
               AND (dr.valid_until IS NULL OR dr.valid_until >= NOW())
             ORDER BY dr.priority DESC
             LIMIT 1),
            -- Fallback: prioritize product-level attrs_json discounts
            (sp.attrs_json->>'base_discount')::numeric,
            (sp.attrs_json->>'base_discount_percent')::numeric,
            s.base_discount_percent,
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
        isi.selection_id,
        isi.selected_at,
        sp.supplier_product_id,
        sp.supplier_id,
        s.name AS supplier_name,
        s.code AS supplier_code,
        sp.supplier_sku,
        sp.name_from_supplier,
        sp.attrs_json->>'brand' AS brand,
        sp.attrs_json,
        sp.uom,
        sp.pack_size,
        sp.barcode,
        sp.category_id,
        c.name AS category_name,
        cp.price AS current_price,
        cp.currency,
        COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL) AS cost_ex_vat,
        COALESCE(sd.base_discount, 0) AS base_discount,
        CASE
          WHEN COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL) IS NOT NULL 
            AND COALESCE(sd.base_discount, 0) > 0
          THEN COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL) - 
               (COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL) * COALESCE(sd.base_discount, 0) / 100)
          ELSE COALESCE((sp.attrs_json->>'cost_excluding')::numeric, cp.price, NULL)
        END AS cost_after_discount,
        ls.qty_on_hand,
        ls.qty_on_hand AS sup_soh,
        sp.stock_status,
        sp.new_stock_eta,
        sp.first_seen_at,
        sp.last_seen_at,
        (COALESCE(ls.qty_on_hand, 0) > 0) AS is_in_stock,
        COALESCE(pt.tags, '[]'::jsonb) AS tags
      FROM core.inventory_selected_item isi
      JOIN core.supplier_product sp ON sp.supplier_product_id = isi.supplier_product_id
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
      LEFT JOIN product_tags pt ON pt.supplier_product_id = sp.supplier_product_id
      LEFT JOIN supplier_discounts sd ON sd.supplier_product_id = sp.supplier_product_id
      WHERE isi.selection_id = $1 AND isi.status = 'selected'
      ORDER BY s.name, sp.name_from_supplier
    `;

    const result = await dbQuery(sql, [selectionId]);
    return NextResponse.json({ success: true, data: result.rows, count: result.rowCount || 0 });
  } catch (error) {
    console.error('[API] selection products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch selection products',
      },
      { status: 500 }
    );
  }
}
