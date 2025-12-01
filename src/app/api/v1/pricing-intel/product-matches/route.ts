import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { ProductMatchService } from '@/lib/services/pricing-intel/ProductMatchService';
import { getOrgId } from '../_helpers';

const service = new ProductMatchService();

const upsertSchema = z.object({
  orgId: z.string().uuid().optional(),
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
  status: z.enum(['pending', 'matched', 'rejected']).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orgId = await getOrgId(request);
    const status = url.searchParams.get('status') ?? undefined;
    const competitorId = url.searchParams.get('competitorId') ?? undefined;
    const matches = await service.list(orgId, {
      status: status ?? undefined,
      competitorId: competitorId ?? undefined,
    });
    return NextResponse.json({ data: matches, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to list product matches',
      },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = upsertSchema.parse(body);
    const orgId = await getOrgId(request, payload);
    const match = await service.upsert(orgId, payload);
    return NextResponse.json({ data: match, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to upsert product match',
      },
      { status: 400 }
    );
  }
}
