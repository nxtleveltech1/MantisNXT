/**
 * GET /api/serve/soh/rolled-up - Rolled-up SOH report (aggregated across suppliers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { stockService } from '@/lib/services/StockService';
import { SohReportRequestSchema } from '@/types/nxt-spp';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const requestData = {
      product_ids: searchParams.get('product_ids')?.split(',').filter(Boolean),
      as_of_date: searchParams.get('as_of_date') ? new Date(searchParams.get('as_of_date')!) : undefined,
      selected_only: searchParams.get('selected_only') === 'true'
    };

    const validated = SohReportRequestSchema.parse(requestData);

    const rolledUpData = await stockService.getSohRolledUp(validated);

    return NextResponse.json({
      success: true,
      data: rolledUpData,
      count: rolledUpData.length,
      filters: validated
    });
  } catch (error) {
    console.error('Rolled-up SOH report error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate rolled-up report'
      },
      { status: 500 }
    );
  }
}
