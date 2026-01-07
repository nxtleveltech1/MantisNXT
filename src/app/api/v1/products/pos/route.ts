/**
 * POS Products API
 * GET /api/v1/products/pos - List products with calculated sale prices for POS
 * 
 * Returns products with:
 * - Base cost from inventory
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
}

/**
 * GET /api/v1/products/pos
 * List products for POS with pricing and stock
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const inStockOnly = searchParams.get('in_stock_only') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Query products with inventory data
    // Note: This queries inventory_items which contains cost data
    // In a production system, this would also join with pricing tiers
    let sql = `
      SELECT
        ii.id,
        ii.sku,
        ii.name,
        ii.description,
        ii.category,
        ii.brand,
        COALESCE(ii.cost_price, 0) as base_cost,
        COALESCE(ii.stock_qty, 0) as available_quantity,
        ii.image_url,
        ii.barcode,
        COALESCE(ii.is_active, true) as is_active
      FROM inventory_items ii
      WHERE ii.is_active = true
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      sql += ` AND (
        ii.name ILIKE $${paramIndex} 
        OR ii.sku ILIKE $${paramIndex} 
        OR ii.barcode ILIKE $${paramIndex}
        OR ii.category ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add category filter
    if (category) {
      sql += ` AND ii.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Filter to only in-stock items
    if (inStockOnly) {
      sql += ` AND COALESCE(ii.stock_qty, 0) > 0`;
    }

    // Add ordering and pagination
    sql += ` ORDER BY ii.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
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
      image_url: string | null;
      barcode: string | null;
      is_active: boolean;
    }>(sql, params);

    // Get total count for pagination
    let countSql = `SELECT COUNT(*) as count FROM inventory_items ii WHERE ii.is_active = true`;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (search) {
      countSql += ` AND (
        ii.name ILIKE $${countParamIndex} 
        OR ii.sku ILIKE $${countParamIndex} 
        OR ii.barcode ILIKE $${countParamIndex}
        OR ii.category ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (category) {
      countSql += ` AND ii.category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    if (inStockOnly) {
      countSql += ` AND COALESCE(ii.stock_qty, 0) > 0`;
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
      image_url: row.image_url,
      barcode: row.barcode,
      is_active: row.is_active,
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
 * Batch check stock for multiple products
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

    // Batch query stock for multiple products
    const placeholders = product_ids.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `
      SELECT 
        id,
        sku,
        name,
        COALESCE(stock_qty, 0) as available_quantity
      FROM inventory_items
      WHERE id IN (${placeholders})
    `;

    const result = await query<{
      id: string;
      sku: string;
      name: string;
      available_quantity: number;
    }>(sql, product_ids);

    // Create a map for easy lookup
    const stockMap: Record<string, { sku: string; name: string; available_quantity: number }> = {};
    result.rows.forEach((row) => {
      stockMap[row.id] = {
        sku: row.sku,
        name: row.name,
        available_quantity: Number(row.available_quantity) || 0,
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

