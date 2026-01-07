/**
 * POS Products API
 * GET /api/v1/products/pos - List products with calculated sale prices for POS
 * 
 * Returns products with:
 * - Base cost from core.stock_on_hand
 * - Calculated sale price (cost + 35% markup)
 * - Real-time stock availability
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Default markup percentage (35%)
const DEFAULT_MARKUP = 0.35;

/**
 * Calculate sale price from cost with markup
 */
function calculateSalePrice(cost: number, markup: number = DEFAULT_MARKUP): number {
  return Math.round(cost * (1 + markup) * 100) / 100; // Round to 2 decimal places
}

export interface POSProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  base_cost: number;
  sale_price: number;
  markup_percent: number;
  available_quantity: number;
  image_url: string | null;
  barcode: string | null;
  is_active: boolean;
  supplier_name: string | null;
}

/**
 * GET /api/v1/products/pos
 * List products for POS with pricing and stock
 * Uses core.supplier_product and core.stock_on_hand tables
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const supplierId = searchParams.get('supplier_id');
    const inStockOnly = searchParams.get('in_stock_only') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Query supplier_product with stock_on_hand for cost and quantity
    let sql = `
      SELECT
        sp.supplier_product_id as id,
        sp.supplier_sku as sku,
        COALESCE(p.name, sp.name_from_supplier) as name,
        sp.attrs_json->>'description' as description,
        sp.attrs_json->>'brand' as brand,
        sp.attrs_json->>'category' as category,
        sp.barcode,
        sp.is_active,
        s.name as supplier_name,
        COALESCE(soh.unit_cost, 0) as base_cost,
        COALESCE(soh.qty, 0) as available_quantity
      FROM core.supplier_product sp
      LEFT JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN core.product p ON p.product_id = sp.product_id
      LEFT JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
      WHERE sp.is_active = true
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      sql += ` AND (
        sp.name_from_supplier ILIKE $${paramIndex} 
        OR sp.supplier_sku ILIKE $${paramIndex} 
        OR sp.barcode ILIKE $${paramIndex}
        OR COALESCE(p.name, '') ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add supplier filter
    if (supplierId) {
      sql += ` AND sp.supplier_id = $${paramIndex}::uuid`;
      params.push(supplierId);
      paramIndex++;
    }

    // Filter to only in-stock items
    if (inStockOnly) {
      sql += ` AND COALESCE(soh.qty, 0) > 0`;
    }

    // Add ordering and pagination
    sql += ` ORDER BY sp.name_from_supplier ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query<{
      id: string;
      sku: string;
      name: string;
      description: string | null;
      category: string | null;
      brand: string | null;
      base_cost: number;
      available_quantity: number;
      barcode: string | null;
      is_active: boolean;
      supplier_name: string | null;
    }>(sql, params);

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as count 
      FROM core.supplier_product sp
      LEFT JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
      LEFT JOIN core.product p ON p.product_id = sp.product_id
      WHERE sp.is_active = true
    `;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (search) {
      countSql += ` AND (
        sp.name_from_supplier ILIKE $${countParamIndex} 
        OR sp.supplier_sku ILIKE $${countParamIndex} 
        OR sp.barcode ILIKE $${countParamIndex}
        OR COALESCE(p.name, '') ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (supplierId) {
      countSql += ` AND sp.supplier_id = $${countParamIndex}::uuid`;
      countParams.push(supplierId);
      countParamIndex++;
    }

    if (inStockOnly) {
      countSql += ` AND COALESCE(soh.qty, 0) > 0`;
    }

    const countResult = await query<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Transform results to include calculated sale price
    const products: POSProduct[] = result.rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      category: row.category,
      brand: row.brand,
      base_cost: Number(row.base_cost) || 0,
      sale_price: calculateSalePrice(Number(row.base_cost) || 0),
      markup_percent: DEFAULT_MARKUP * 100,
      available_quantity: Number(row.available_quantity) || 0,
      image_url: null, // Not in current schema
      barcode: row.barcode,
      is_active: row.is_active,
      supplier_name: row.supplier_name,
    }));

    return NextResponse.json({
      success: true,
      data: products,
      total,
      limit,
      offset,
      markup_percent: DEFAULT_MARKUP * 100,
    });
  } catch (error) {
    console.error('Error in GET /api/v1/products/pos:', error);
    // Include more details for debugging production issues
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack?.split('\n').slice(0, 5).join('\n') }
      : { message: 'Failed to fetch products' };
    console.error('POS API Error Details:', JSON.stringify(errorDetails));
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/products/pos/check-stock
 * Batch check stock for multiple products (supplier_product_id)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_ids } = body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'product_ids array is required' },
        { status: 400 }
      );
    }

    // Batch query stock for multiple products from core.supplier_product + core.stock_on_hand
    const placeholders = product_ids.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `
      SELECT 
        sp.supplier_product_id as id,
        sp.supplier_sku as sku,
        COALESCE(p.name, sp.name_from_supplier) as name,
        COALESCE(soh.qty, 0) as available_quantity,
        COALESCE(soh.unit_cost, 0) as unit_cost
      FROM core.supplier_product sp
      LEFT JOIN core.product p ON p.product_id = sp.product_id
      LEFT JOIN core.stock_on_hand soh ON soh.supplier_product_id = sp.supplier_product_id
      WHERE sp.supplier_product_id IN (${placeholders})
    `;

    const result = await query<{
      id: string;
      sku: string;
      name: string;
      available_quantity: number;
      unit_cost: number;
    }>(sql, product_ids);

    // Create a map for easy lookup
    const stockMap: Record<string, { sku: string; name: string; available_quantity: number; unit_cost: number }> = {};
    result.rows.forEach((row) => {
      stockMap[row.id] = {
        sku: row.sku,
        name: row.name,
        available_quantity: Number(row.available_quantity) || 0,
        unit_cost: Number(row.unit_cost) || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: stockMap,
    });
  } catch (error) {
    console.error('Error in POST /api/v1/products/pos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check stock',
      },
      { status: 500 }
    );
  }
}

