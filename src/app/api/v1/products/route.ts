/**
 * Products API for AI Services
 * GET /api/v1/products - List products for AI forecasting
 */

import type { NextRequest } from 'next/server';
import { handleAIError, authenticateRequest, successResponse } from '@/lib/ai/api-utils';
import { query } from '@/lib/database';

/**
 * GET /api/v1/products
 * List all products from inventory for AI forecasting
 * Returns simple product list with id, name, sku
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    // Build query for real products from inventory_items table
    let sql = `
      SELECT
        id,
        name,
        sku,
        category,
        stock_qty as quantity,
        reorder_point
      FROM inventory_items
      WHERE organization_id = $1
    `;

    const params: unknown[] = [user.org_id];
    let paramIndex = 2;

    // Add search filter if provided
    if (search) {
      sql += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR category ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY name ASC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query<{
      id: string;
      name: string;
      sku: string;
      category: string;
      quantity: number;
      reorder_point: number;
    }>(sql, params);

    return successResponse(result.rows);
  } catch (error) {
    return handleAIError(error);
  }
}
