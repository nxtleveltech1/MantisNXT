/**
 * Supplier Categories API
 * Get categories associated with a supplier's products
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/suppliers/[id]/categories
 * List all categories associated with supplier's products
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';

    const sql = `
      SELECT 
        c.category_id,
        c.name as category_name,
        c.path as category_path,
        c.level,
        c.parent_id,
        COUNT(DISTINCT sp.supplier_product_id) as product_count
      FROM core.category c
      INNER JOIN core.supplier_product sp ON sp.category_id = c.category_id
      WHERE sp.supplier_id = $1
        AND sp.is_active = true
        AND c.is_active = true
        ${search ? `AND (c.name ILIKE $2 OR c.path ILIKE $2)` : ''}
      GROUP BY c.category_id, c.name, c.path, c.level, c.parent_id
      ORDER BY c.path ASC, c.name ASC
    `;

    const result = await query(
      sql,
      search ? [id, `%${search}%`] : [id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Get supplier categories API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch supplier categories',
      },
      { status: 500 }
    );
  }
}

