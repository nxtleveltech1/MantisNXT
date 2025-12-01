import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ProductMatchService } from '@/lib/services/pricing-intel/ProductMatchService';
import { getOrgId } from '../../_helpers';

const bulkImportSchema = z.object({
  matches: z.array(
    z.object({
      competitor_id: z.string().uuid(),
      competitor_product_id: z.string(),
      competitor_sku: z.string().optional(),
      competitor_title: z.string().optional(),
      competitor_url: z.string().url().optional(),
      internal_product_id: z.string().uuid().optional(),
      internal_sku: z.string().optional(),
      upc: z.string().optional(),
      ean: z.string().optional(),
      asin: z.string().optional(),
      mpn: z.string().optional(),
      match_confidence: z.number().min(0).max(100).optional(),
      match_method: z.enum(['manual', 'upc', 'fuzzy', 'ai']).optional(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orgId = await getOrgId(request, body);

    const validated = bulkImportSchema.parse(body);

    const service = new ProductMatchService();
    const results = {
      successful: [] as Array<{ match_id: string; competitor_product_id: string }>,
      failed: [] as Array<{ competitor_product_id: string; error: string }>,
    };

    for (const match of validated.matches) {
      try {
        const created = await service.createMatch(orgId, {
          competitor_id: match.competitor_id,
          competitor_product_id: match.competitor_product_id,
          competitor_sku: match.competitor_sku,
          competitor_title: match.competitor_title,
          competitor_url: match.competitor_url,
          internal_product_id: match.internal_product_id,
          internal_sku: match.internal_sku,
          upc: match.upc,
          ean: match.ean,
          asin: match.asin,
          mpn: match.mpn,
          match_confidence: match.match_confidence ?? 50,
          match_method: match.match_method ?? 'manual',
          status: 'pending',
        });
        results.successful.push({
          match_id: created.match_id,
          competitor_product_id: match.competitor_product_id,
        });
      } catch (error) {
        results.failed.push({
          competitor_product_id: match.competitor_product_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      data: {
        total: validated.matches.length,
        successful: results.successful.length,
        failed: results.failed.length,
        results,
      },
      error: null,
    });
  } catch (error) {
    console.error('Error bulk importing matches:', error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to bulk import matches',
        },
      },
      { status: 500 }
    );
  }
}





