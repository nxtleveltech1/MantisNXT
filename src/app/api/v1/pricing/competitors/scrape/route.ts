/**
 * Competitor Price Scraping Job API
 * 
 * POST /api/v1/pricing/competitors/scrape - Trigger competitor price scraping job
 */

import { NextRequest, NextResponse } from 'next/server';
import { runCompetitorPriceScraping } from '@/lib/jobs/competitor-price-scraper';
import { z } from 'zod';

const ScrapingJobSchema = z.object({
  org_id: z.string().uuid(),
  competitor_names: z.array(z.string()).optional(),
  product_ids: z.array(z.string().uuid()).optional(),
  max_products: z.number().int().positive().optional(),
  rate_limit_ms: z.number().int().positive().optional(),
});

/**
 * POST /api/v1/pricing/competitors/scrape
 * Trigger competitor price scraping job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ScrapingJobSchema.parse(body);

    // Run scraping job asynchronously
    const result = await runCompetitorPriceScraping(validatedData);

    return NextResponse.json({
      success: result.success,
      data: result,
      message: `Scraping job completed: ${result.prices_collected} prices collected`,
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

    console.error('Error running scraping job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run scraping job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



