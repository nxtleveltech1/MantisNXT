/**
 * GET /api/core/suppliers/products/table - Get product table view for supplier selection UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { supplierProductService } from '@/lib/services/SupplierProductService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID is required' },
        { status: 400 }
      );
    }

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const options = {
      include_inactive: searchParams.get('include_inactive') === 'true',
      include_unmapped: searchParams.get('include_unmapped') === 'true',
      category_id: searchParams.get('category_id') || undefined,
      search: searchParams.get('search') || undefined,
      limit: limit > 0 ? limit : 50,
      offset: offset >= 0 ? offset : 0
    };

    const { products, total } = await supplierProductService.getProductTable(supplierId, options);

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: (options.offset + products.length) < total
    });
  } catch (error) {
    console.error('Get product table error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get product table'
      },
      { status: 500 }
    );
  }
}
