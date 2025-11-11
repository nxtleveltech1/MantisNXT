/**
 * GET /api/serve/soh - Stock on Hand reporting
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { stockService } from '@/lib/services/StockService';
import { SohReportRequestSchema } from '@/types/nxt-spp';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const requestData = {
      supplier_ids: searchParams.get('supplier_ids')?.split(',').filter(Boolean),
      location_ids: searchParams.get('location_ids')?.split(',').filter(Boolean),
      product_ids: searchParams.get('product_ids')?.split(',').filter(Boolean),
      as_of_date: searchParams.get('as_of_date') ? new Date(searchParams.get('as_of_date')!) : undefined,
      group_by: searchParams.get('group_by') as unknown || undefined,
      include_zero_stock: searchParams.get('include_zero_stock') === 'true',
      selected_only: searchParams.get('selected_only') === 'true'
    };

    // Validate request
    const validated = SohReportRequestSchema.parse(requestData);

    // Get SOH by supplier
    const sohData = await stockService.getSohBySupplier(validated);

    return NextResponse.json({
      success: true,
      data: sohData,
      count: sohData.length,
      filters: validated
    });
  } catch (error) {
    console.error('SOH report error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report'
      },
      { status: 500 }
    );
  }
}
