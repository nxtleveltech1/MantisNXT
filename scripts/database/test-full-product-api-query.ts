#!/usr/bin/env bun
/**
 * Test the full product API query
 */

import { query } from '../../src/lib/database/unified-connection';

const productId = process.argv[2] || 'b2f72543-27a0-4411-ac19-76729e07236e';

async function testFullQuery() {
  console.log(`Testing FULL product API query for: ${productId}\n`);

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
    previous_prices AS (
      SELECT DISTINCT ON (ph.supplier_product_id)
        ph.supplier_product_id,
        ph.price AS previous_price,
        ph.valid_to
      FROM core.price_history ph
      JOIN current_prices cp ON cp.supplier_product_id = ph.supplier_product_id
      WHERE ph.is_current = false
        AND ph.valid_to <= cp.valid_from
      ORDER BY ph.supplier_product_id, ph.valid_to DESC
    ),
    latest_stock AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        qty AS qty_on_hand,
        as_of_ts
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
      WHERE ata.supplier_product_id = $1
      GROUP BY ata.supplier_product_id
    ),
    attrs_json_tags AS (
      SELECT 
        sp.supplier_product_id,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'tag_id', tag_val,
              'name', tag_val,
              'type', 'auto',
              'assigned_at', NULL,
              'assigned_by', 'system'
            )
          ) FILTER (WHERE tag_val IS NOT NULL AND tag_val <> ''),
          '[]'::jsonb
        ) AS attrs_tags
      FROM core.supplier_product sp
      CROSS JOIN LATERAL jsonb_array_elements_text(sp.attrs_json->'tags') AS tag_val
      WHERE sp.attrs_json ? 'tags' AND sp.supplier_product_id = $1
      GROUP BY sp.supplier_product_id
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
          -- Brand-level discount
          (SELECT dr.discount_percent 
           FROM core.supplier_discount_rules dr
           JOIN core.product p ON p.product_id = sp.product_id
           WHERE dr.supplier_id = sp.supplier_id
             AND dr.scope_type = 'brand'
             AND dr.brand_id = p.brand_id
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
          -- Fallback to base_discount_percent
          s.base_discount_percent,
          (sp.attrs_json->>'base_discount')::numeric,
          COALESCE(
            (sprof.guidelines->'pricing'->>'discount_percentage')::numeric,
            0
          )
        ) AS base_discount
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN public.supplier_profiles sprof ON sprof.supplier_id = sp.supplier_id 
        AND sprof.profile_name = 'default' 
        AND sprof.is_active = true
      WHERE sp.supplier_product_id = $1
    )
    SELECT
      sp.*, 
      s.name AS supplier_name, 
      s.code AS supplier_code,
      c.category_id,
      CASE WHEN c.name IS NOT NULL AND c.name <> '' THEN c.name ELSE cat.category_raw END AS category_name,
      c.parent_id AS category_parent_id,
      c.path AS category_path,
      c.level AS category_level,
      c.is_active AS category_is_active,
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
      pp.previous_price,
      pp.valid_to AS previous_price_valid_to,
      ls.qty_on_hand,
      ls.as_of_ts AS stock_as_of_ts,
      COALESCE(
        CASE WHEN pt.tags IS NOT NULL AND jsonb_array_length(pt.tags) > 0 THEN pt.tags ELSE at.attrs_tags END,
        '[]'::jsonb
      ) AS tags,
      -- Stock Status: prefer direct column, then attrs_json, then pricelist_row
      COALESCE(
        sp.stock_status,
        sp.attrs_json->>'stock_status',
        pls.stock_status
      ) AS stock_status,
      -- New Stock ETA: prefer direct column, then attrs_json, then pricelist_row
      COALESCE(
        sp.new_stock_eta,
        (sp.attrs_json->>'new_stock_eta')::date,
        pls.eta
      ) AS new_stock_eta,
      -- Brand name: prefer attrs_json, then pricelist_row
      COALESCE(
        sp.attrs_json->>'brand',
        pls.brand
      ) AS brand_name,
      -- Manufacturer: prefer pricelist_row attrs_json, then supplier_product attrs_json
      COALESCE(
        pr_attrs.manufacturer,
        sp.attrs_json->>'manufacturer'
      ) AS manufacturer,
      -- Model: prefer pricelist_row attrs_json, then supplier_product attrs_json
      COALESCE(
        pr_attrs.model,
        sp.attrs_json->>'model'
      ) AS model,
      -- Series Range: prefer pricelist_row attrs_json, then supplier_product attrs_json
      COALESCE(
        pr_attrs.series_range,
        sp.attrs_json->>'seriesRange',
        sp.attrs_json->>'series_range',
        sp.attrs_json->>'series',
        sp.attrs_json->>'range'
      ) AS series_range,
      -- MPN: prefer pricelist_row attrs_json, then supplier_product attrs_json
      COALESCE(
        pr_attrs.mpn,
        sp.attrs_json->>'mpn',
        sp.attrs_json->>'manufacturer_part_number',
        sp.attrs_json->>'MPN'
      ) AS mpn
    FROM core.supplier_product sp
    JOIN core.supplier s ON s.supplier_id = sp.supplier_id
    LEFT JOIN core.category c ON c.category_id = sp.category_id
    LEFT JOIN LATERAL (
      SELECT r.category_raw
      FROM spp.pricelist_row r
      JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
      WHERE r.supplier_sku = sp.supplier_sku AND r.category_raw IS NOT NULL AND r.category_raw <> ''
      ORDER BY u.received_at DESC, r.row_num DESC
      LIMIT 1
    ) cat ON TRUE
    LEFT JOIN LATERAL (
      SELECT r.stock_status, r.eta, r.brand
      FROM spp.pricelist_row r
      JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
      WHERE r.supplier_sku = sp.supplier_sku
        AND (r.stock_status IS NOT NULL OR r.eta IS NOT NULL OR r.brand IS NOT NULL)
      ORDER BY u.received_at DESC, r.row_num DESC
      LIMIT 1
    ) pls ON TRUE
    LEFT JOIN LATERAL (
      SELECT 
        COALESCE(
          r.attrs_json->>'seriesRange',
          r.attrs_json->>'series_range',
          r.attrs_json->>'series',
          r.attrs_json->>'range'
        ) AS series_range,
        COALESCE(
          r.attrs_json->>'mpn',
          r.attrs_json->>'manufacturer_part_number',
          r.attrs_json->>'MPN'
        ) AS mpn,
        r.attrs_json->>'manufacturer' AS manufacturer,
        r.attrs_json->>'model' AS model
      FROM spp.pricelist_row r
      JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
      WHERE r.supplier_sku = sp.supplier_sku
      ORDER BY u.received_at DESC, r.row_num DESC
      LIMIT 1
    ) pr_attrs ON TRUE
    LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
    LEFT JOIN previous_prices pp ON pp.supplier_product_id = sp.supplier_product_id
    LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
    LEFT JOIN product_tags pt ON pt.supplier_product_id = sp.supplier_product_id
    LEFT JOIN attrs_json_tags at ON at.supplier_product_id = sp.supplier_product_id
    LEFT JOIN supplier_discounts sd ON sd.supplier_product_id = sp.supplier_product_id
    WHERE sp.supplier_product_id = $1
    LIMIT 1
  `;

  try {
    const result = await query<unknown>(sql, [productId]);
    console.log('✅ Full query succeeded');
    console.log(`Rows returned: ${result.rowCount}`);
    if (result.rows.length > 0) {
      // Just show key fields
      const r = result.rows[0] as Record<string, unknown>;
      console.log('\nKey fields:');
      console.log(`  supplier_sku: ${r.supplier_sku}`);
      console.log(`  name_from_supplier: ${r.name_from_supplier}`);
      console.log(`  supplier_name: ${r.supplier_name}`);
      console.log(`  current_price: ${r.current_price}`);
      console.log(`  qty_on_hand: ${r.qty_on_hand}`);
    }
  } catch (error) {
    console.log('❌ Full query FAILED');
    console.log('Error:', error);
  }

  process.exit(0);
}

testFullQuery().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

