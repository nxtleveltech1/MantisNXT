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

    const options = {
      include_inactive: searchParams.get('include_inactive') === 'true',
      include_unmapped: searchParams.get('include_unmapped') === 'true',
      category_id: searchParams.get('category_id') || undefined,
      search: searchParams.get('search') || undefined
    };

    const products = await supplierProductService.getProductTable(supplierId, options);

    return NextResponse.json({
      success: true,
      products,
      count: products.length
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
