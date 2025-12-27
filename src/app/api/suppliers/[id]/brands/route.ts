/**
 * Supplier Brands API
 * Get brands associated with a supplier's products
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/suppliers/[id]/brands
 * List all brands associated with supplier's products
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';

    // Get brands from supplier products via brand_from_supplier field
    // and also from core.product if linked
    const sql = `
      SELECT DISTINCT
        COALESCE(b.id, gen_random_uuid()) as brand_id,
        COALESCE(b.name, sp.brand_from_supplier) as brand_name,
        b.description,
        b.logo_url,
        b.website,
        COUNT(DISTINCT sp.supplier_product_id) as product_count
      FROM core.supplier_product sp
      LEFT JOIN core.product p ON p.product_id = sp.product_id
      LEFT JOIN public.brand b ON (
        b.id = p.brand_id OR 
        LOWER(TRIM(b.name)) = LOWER(TRIM(sp.brand_from_supplier))
      )
      WHERE sp.supplier_id = $1
        AND sp.is_active = true
        AND sp.brand_from_supplier IS NOT NULL
        AND TRIM(sp.brand_from_supplier) != ''
        ${search ? `AND (COALESCE(b.name, sp.brand_from_supplier) ILIKE $2)` : ''}
      GROUP BY 
        COALESCE(b.id, gen_random_uuid()),
        COALESCE(b.name, sp.brand_from_supplier),
        b.description,
        b.logo_url,
        b.website
      ORDER BY brand_name ASC
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
    console.error('Get supplier brands API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch supplier brands',
      },
      { status: 500 }
    );
  }
}

