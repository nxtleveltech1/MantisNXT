/**
 * POST /api/serve/soh/import - Bulk import stock snapshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { stockService } from '@/lib/services/StockService';
import { z } from 'zod';

const StockImportSchema = z.array(
  z.object({
    location_id: z.string().uuid(),
    supplier_product_id: z.string().uuid(),
    qty: z.number().min(0),
    unit_cost: z.number().positive().optional(),
    as_of_ts: z.string().transform(str => new Date(str)).optional()
  })
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const stocks = StockImportSchema.parse(body);

    const result = await stockService.bulkImportStock(stocks);

    return NextResponse.json({
      success: result.errors.length === 0,
      imported: result.imported,
      failed: stocks.length - result.imported,
      errors: result.errors
    });
  } catch (error) {
    console.error('Stock import error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      },
      { status: 500 }
    );
  }
}
