/**
 * GET /api/core/selections/catalog - Get selected catalog (all active selections)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { inventorySelectionService } from '@/lib/services/InventorySelectionService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      supplier_id: searchParams.get('supplier_id') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      in_stock_only: searchParams.get('in_stock_only') === 'true',
      search: searchParams.get('search') || undefined,
    };

    const catalog = await inventorySelectionService.getSelectedCatalog(filters);

    return NextResponse.json({
      success: true,
      catalog,
      count: catalog.length,
    });
  } catch (error) {
    console.error('Get selected catalog error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get catalog',
      },
      { status: 500 }
    );
  }
}
