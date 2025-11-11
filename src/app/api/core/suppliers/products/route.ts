/**
 * /api/core/suppliers/products - Supplier product management
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { supplierProductService } from '@/lib/services/SupplierProductService';

/**
 * GET /api/core/suppliers/products - List supplier products
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      supplier_id: searchParams.get('supplier_id') || undefined,
      is_new: searchParams.get('is_new') === 'true' ? true : undefined,
      is_active: searchParams.get('is_active') === 'true' ? true : searchParams.get('is_active') === 'false' ? false : undefined,
      is_mapped: searchParams.get('is_mapped') === 'true' ? true : searchParams.get('is_mapped') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    const result = await supplierProductService.list(filters);

    return NextResponse.json({
      success: true,
      ...result,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.limit)
      }
    });
  } catch (error) {
    console.error('List supplier products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list products'
      },
      { status: 500 }
    );
  }
}
