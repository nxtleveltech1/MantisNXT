/**
 * GET /api/serve/soh/value - Get total inventory value
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { stockService } from '@/lib/services/StockService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      supplier_ids: searchParams.get('supplier_ids')?.split(',').filter(Boolean),
      location_ids: searchParams.get('location_ids')?.split(',').filter(Boolean),
      selected_only: searchParams.get('selected_only') === 'true',
    };

    const valueData = await stockService.getTotalInventoryValue(filters);

    return NextResponse.json({
      success: true,
      ...valueData,
    });
  } catch (error) {
    console.error('Inventory value error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate inventory value',
      },
      { status: 500 }
    );
  }
}
