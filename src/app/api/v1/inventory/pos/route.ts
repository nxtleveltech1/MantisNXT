/**
 * POS Inventory API
 * GET /api/v1/inventory/pos - Get real-time stock levels for POS
 * POST /api/v1/inventory/pos - Batch check stock for multiple products
 * 
 * Provides real-time inventory data for the POS system
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export interface POSInventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  stock_qty: number;
  reserved_qty: number;
  available_qty: number;
  reorder_point: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

/**
 * GET /api/v1/inventory/pos
 * Get real-time stock levels for POS
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const lowStockOnly = searchParams.get('low_stock_only') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let sql = `
      SELECT
        id,
        sku,
        name,
        category,
        COALESCE(stock_qty, 0) as stock_qty,
        COALESCE(reserved_qty, 0) as reserved_qty,
        COALESCE(stock_qty, 0) - COALESCE(reserved_qty, 0) as available_qty,
        COALESCE(reorder_point, 0) as reorder_point,
        CASE WHEN COALESCE(stock_qty, 0) <= COALESCE(reorder_point, 0) THEN true ELSE false END as is_low_stock,
        CASE WHEN COALESCE(stock_qty, 0) <= 0 THEN true ELSE false END as is_out_of_stock
      FROM inventory_items
      WHERE is_active = true
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR barcode ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (lowStockOnly) {
      sql += ` AND COALESCE(stock_qty, 0) <= COALESCE(reorder_point, 0)`;
    }

    sql += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query<POSInventoryItem>(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM inventory_items WHERE is_active = true`;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (search) {
      countSql += ` AND (name ILIKE $${countParamIndex} OR sku ILIKE $${countParamIndex} OR barcode ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (category) {
      countSql += ` AND category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    if (lowStockOnly) {
      countSql += ` AND COALESCE(stock_qty, 0) <= COALESCE(reorder_point, 0)`;
    }

    const countResult = await query<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/v1/inventory/pos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/inventory/pos
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

    // Limit batch size
    if (product_ids.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 products per batch check' },
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
        COALESCE(stock_qty, 0) as stock_qty,
        COALESCE(reserved_qty, 0) as reserved_qty,
        COALESCE(stock_qty, 0) - COALESCE(reserved_qty, 0) as available_qty
      FROM inventory_items
      WHERE id IN (${placeholders})
    `;

    const result = await query<{
      id: string;
      sku: string;
      name: string;
      stock_qty: number;
      reserved_qty: number;
      available_qty: number;
    }>(sql, product_ids);

    // Create a map for easy lookup
    const stockMap: Record<
      string,
      { sku: string; name: string; stock_qty: number; reserved_qty: number; available_qty: number }
    > = {};

    result.rows.forEach((row) => {
      stockMap[row.id] = {
        sku: row.sku,
        name: row.name,
        stock_qty: Number(row.stock_qty) || 0,
        reserved_qty: Number(row.reserved_qty) || 0,
        available_qty: Number(row.available_qty) || 0,
      };
    });

    // Check for products not found
    const notFound = product_ids.filter((id) => !stockMap[id]);

    return NextResponse.json({
      success: true,
      data: stockMap,
      not_found: notFound.length > 0 ? notFound : undefined,
    });
  } catch (error) {
    console.error('Error in POST /api/v1/inventory/pos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check stock',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/inventory/pos
 * Reserve stock for a pending transaction (optional pre-checkout)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, quantity, action, reservation_id } = body;

    if (!product_id || !quantity || !action) {
      return NextResponse.json(
        { success: false, error: 'product_id, quantity, and action are required' },
        { status: 400 }
      );
    }

    if (!['reserve', 'release'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be "reserve" or "release"' },
        { status: 400 }
      );
    }

    // Check current stock
    const stockResult = await query<{ stock_qty: number; reserved_qty: number }>(
      `SELECT COALESCE(stock_qty, 0) as stock_qty, COALESCE(reserved_qty, 0) as reserved_qty 
       FROM inventory_items WHERE id = $1`,
      [product_id]
    );

    if (stockResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const current = stockResult.rows[0];
    const availableQty = Number(current.stock_qty) - Number(current.reserved_qty);

    if (action === 'reserve') {
      // Check if enough stock available
      if (quantity > availableQty) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient stock',
            available_qty: availableQty,
            requested_qty: quantity,
          },
          { status: 400 }
        );
      }

      // Reserve the stock
      await query(
        `UPDATE inventory_items 
         SET reserved_qty = COALESCE(reserved_qty, 0) + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [quantity, product_id]
      );

      return NextResponse.json({
        success: true,
        action: 'reserved',
        product_id,
        quantity,
        new_reserved_qty: Number(current.reserved_qty) + quantity,
        new_available_qty: availableQty - quantity,
      });
    } else {
      // Release reserved stock
      const newReserved = Math.max(0, Number(current.reserved_qty) - quantity);

      await query(
        `UPDATE inventory_items 
         SET reserved_qty = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [newReserved, product_id]
      );

      return NextResponse.json({
        success: true,
        action: 'released',
        product_id,
        quantity,
        new_reserved_qty: newReserved,
        new_available_qty: Number(current.stock_qty) - newReserved,
      });
    }
  } catch (error) {
    console.error('Error in PATCH /api/v1/inventory/pos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update reservation',
      },
      { status: 500 }
    );
  }
}

