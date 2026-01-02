/**
 * GET /api/products/compare-suppliers
 *
 * Cross-supplier SKU search - returns all supplier offerings
 * for a given SKU or product name, enabling price comparison
 * across multiple suppliers.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';
import {
  CompareSupplierRequestSchema,
  type SupplierOffer,
  type SKUComparison,
  type CompareSupplierResponse,
} from '@/types/supplier-comparison';

interface SupplierOfferRow {
  supplier_product_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string | null;
  supplier_tier: string | null;
  supplier_sku: string;
  name_from_supplier: string;
  brand: string | null;
  barcode: string | null;
  uom: string | null;
  pack_size: string | null;
  current_price: string | null;
  currency: string;
  base_discount: string | null;
  stock_on_hand: string | null;
  lead_time_days: number | null;
  minimum_order_qty: number | null;
  first_seen_at: Date;
  last_seen_at: Date | null;
  is_preferred_supplier: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate request
    const rawParams = {
      query: searchParams.get('query') || '',
      include_out_of_stock: searchParams.get('include_out_of_stock') !== 'false',
      min_price: searchParams.get('min_price')
        ? Number(searchParams.get('min_price'))
        : undefined,
      max_price: searchParams.get('max_price')
        ? Number(searchParams.get('max_price'))
        : undefined,
      supplier_ids: searchParams.get('supplier_ids')
        ? searchParams.get('supplier_ids')!.split(',')
        : undefined,
      sort_by: searchParams.get('sort_by') || 'price',
      sort_dir: searchParams.get('sort_dir') || 'asc',
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 50,
    };

    const parsed = CompareSupplierRequestSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const params = parsed.data;

    if (!params.query || params.query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Build dynamic SQL based on filters
    const conditions: string[] = ['sp.is_active = true', 's.active = true'];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    // Search by SKU or product name
    const searchTerm = `%${params.query.trim()}%`;
    conditions.push(
      `(sp.supplier_sku ILIKE $${paramIndex} OR sp.name_from_supplier ILIKE $${paramIndex})`
    );
    queryParams.push(searchTerm);
    paramIndex++;

    // Optional: filter by supplier IDs
    if (params.supplier_ids && params.supplier_ids.length > 0) {
      conditions.push(`sp.supplier_id = ANY($${paramIndex}::uuid[])`);
      queryParams.push(params.supplier_ids);
      paramIndex++;
    }

    // Optional: price range filters (applied after join with price_history)
    let priceConditions = '';
    if (params.min_price !== undefined) {
      priceConditions += ` AND ph.price >= $${paramIndex}`;
      queryParams.push(params.min_price);
      paramIndex++;
    }
    if (params.max_price !== undefined) {
      priceConditions += ` AND ph.price <= $${paramIndex}`;
      queryParams.push(params.max_price);
      paramIndex++;
    }

    // Build ORDER BY clause
    let orderBy = 'ph.price ASC NULLS LAST';
    switch (params.sort_by) {
      case 'price':
        orderBy = params.sort_dir === 'desc' ? 'ph.price DESC NULLS LAST' : 'ph.price ASC NULLS LAST';
        break;
      case 'supplier_name':
        orderBy = params.sort_dir === 'desc' ? 's.name DESC' : 's.name ASC';
        break;
      case 'lead_time':
        orderBy =
          params.sort_dir === 'desc'
            ? 's.lead_time DESC NULLS LAST'
            : 's.lead_time ASC NULLS LAST';
        break;
      case 'stock':
        orderBy =
          params.sort_dir === 'desc'
            ? 'soh.qty DESC NULLS LAST'
            : 'soh.qty ASC NULLS LAST';
        break;
    }

    const sql = `
      WITH current_prices AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          price,
          currency
        FROM core.price_history
        WHERE is_current = true
        ORDER BY supplier_product_id, valid_from DESC
      ),
      latest_stock AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          qty
        FROM core.stock_on_hand
        ORDER BY supplier_product_id, as_of_ts DESC
      ),
      supplier_discounts AS (
        SELECT 
          sp.supplier_product_id,
          COALESCE(s.base_discount_percent, 0) AS base_discount
        FROM core.supplier_product sp
        JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      )
      SELECT
        sp.supplier_product_id,
        sp.supplier_id,
        s.name AS supplier_name,
        s.code AS supplier_code,
        s.tier AS supplier_tier,
        sp.supplier_sku,
        sp.name_from_supplier,
        sp.attrs_json->>'brand' AS brand,
        sp.barcode,
        sp.uom,
        sp.pack_size,
        ph.price AS current_price,
        COALESCE(ph.currency, 'ZAR') AS currency,
        sd.base_discount,
        soh.qty AS stock_on_hand,
        s.lead_time AS lead_time_days,
        s.minimum_order_value AS minimum_order_qty,
        sp.first_seen_at,
        sp.last_seen_at,
        COALESCE(s.preferred_supplier, false) AS is_preferred_supplier
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN current_prices ph ON ph.supplier_product_id = sp.supplier_product_id
      LEFT JOIN latest_stock soh ON soh.supplier_product_id = sp.supplier_product_id
      LEFT JOIN supplier_discounts sd ON sd.supplier_product_id = sp.supplier_product_id
      WHERE ${conditions.join(' AND ')}
        ${priceConditions}
        ${!params.include_out_of_stock ? 'AND COALESCE(soh.qty, 0) > 0' : ''}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex}
    `;

    queryParams.push(params.limit);

    const result = await dbQuery<SupplierOfferRow>(sql, queryParams);

    // Transform rows to SupplierOffer objects
    const offers: SupplierOffer[] = result.rows.map(row => {
      const offer: SupplierOffer = {
        supplier_product_id: row.supplier_product_id,
        supplier_id: row.supplier_id,
        supplier_name: row.supplier_name,
        supplier_sku: row.supplier_sku,
        name_from_supplier: row.name_from_supplier,
        current_price: row.current_price ? parseFloat(row.current_price) : null,
        currency: row.currency || 'ZAR',
        stock_on_hand: row.stock_on_hand ? parseInt(row.stock_on_hand) : null,
        first_seen_at: new Date(row.first_seen_at),
        last_seen_at: row.last_seen_at ? new Date(row.last_seen_at) : null,
        is_preferred_supplier: row.is_preferred_supplier,
        is_in_stock: row.stock_on_hand ? parseInt(row.stock_on_hand) > 0 : false,
      };

      // Only set optional properties if they have values
      if (row.supplier_code) offer.supplier_code = row.supplier_code;
      const validTiers = ['strategic', 'preferred', 'approved', 'conditional'] as const;
      if (row.supplier_tier && validTiers.includes(row.supplier_tier as typeof validTiers[number])) {
        offer.supplier_tier = row.supplier_tier as typeof validTiers[number];
      }
      if (row.brand) offer.brand = row.brand;
      if (row.barcode) offer.barcode = row.barcode;
      if (row.uom) offer.uom = row.uom;
      if (row.pack_size) offer.pack_size = row.pack_size;
      if (row.base_discount) offer.base_discount = parseFloat(row.base_discount);
      if (row.lead_time_days !== null) offer.lead_time_days = row.lead_time_days;
      if (row.minimum_order_qty !== null) offer.minimum_order_qty = row.minimum_order_qty;

      // Calculate cost after discount
      if (row.current_price && row.base_discount) {
        offer.cost_after_discount = parseFloat(row.current_price) * (1 - parseFloat(row.base_discount) / 100);
      } else if (row.current_price) {
        offer.cost_after_discount = parseFloat(row.current_price);
      }

      return offer;
    });

    // Group offers by SKU for comparison view
    const skuMap = new Map<string, SupplierOffer[]>();
    for (const offer of offers) {
      const key = offer.supplier_sku.toUpperCase();
      if (!skuMap.has(key)) {
        skuMap.set(key, []);
      }
      skuMap.get(key)!.push(offer);
    }

    // Build comparison objects with stats
    const comparisons: SKUComparison[] = [];
    for (const [sku, skuOffers] of skuMap) {
      const prices = skuOffers
        .map(o => o.cost_after_discount ?? o.current_price)
        .filter((p): p is number => p !== null);

      const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
      const highestPrice = prices.length > 0 ? Math.max(...prices) : null;

      // Mark best price offer
      skuOffers.forEach(offer => {
        const effectivePrice = offer.cost_after_discount ?? offer.current_price;
        offer.is_best_price = effectivePrice === lowestPrice;
      });

      const comparison: SKUComparison = {
        sku,
        product_name: skuOffers[0].name_from_supplier,
        offers: skuOffers,
        lowest_price: lowestPrice,
        highest_price: highestPrice,
        price_range_percent:
          lowestPrice && highestPrice && lowestPrice > 0
            ? Math.round(((highestPrice - lowestPrice) / lowestPrice) * 100)
            : null,
        total_suppliers: skuOffers.length,
        suppliers_in_stock: skuOffers.filter(o => o.is_in_stock).length,
      };

      // Only set optional properties if they have values
      if (skuOffers[0].brand) comparison.brand = skuOffers[0].brand;

      comparisons.push(comparison);
    }

    const response: CompareSupplierResponse = {
      success: true,
      data: {
        query: params.query,
        comparisons,
        total_offers: offers.length,
        total_skus: comparisons.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[compare-suppliers] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

