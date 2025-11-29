/**
 * Competitor Price Import API
 * 
 * POST /api/v1/pricing/competitors/import - Import competitor prices (manual or bulk)
 */

import { NextRequest, NextResponse } from 'next/server';
import { CompetitorPriceScrapingService } from '@/lib/services/CompetitorPriceScrapingService';
import { z } from 'zod';

const CompetitorPriceSchema = z.object({
  product_id: z.string().uuid(),
  competitor_name: z.string().min(1),
  competitor_sku: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().length(3).optional().default('ZAR'),
  source_url: z.string().url().optional(),
  source_type: z.enum(['manual', 'scraper', 'api', 'feed']).optional().default('manual'),
  in_stock: z.boolean().optional(),
  stock_level: z.enum(['low', 'medium', 'high', 'out_of_stock']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const BulkImportSchema = z.object({
  org_id: z.string().uuid(),
  prices: z.array(CompetitorPriceSchema),
});

/**
 * POST /api/v1/pricing/competitors/import
 * Import competitor prices (single or bulk)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = BulkImportSchema.parse(body);

    const result = await CompetitorPriceScrapingService.bulkImportPrices(
      validatedData.org_id,
      validatedData.prices
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Imported ${result.succeeded} competitor prices${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error importing competitor prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import competitor prices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}








