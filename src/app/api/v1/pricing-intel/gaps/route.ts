import { NextRequest, NextResponse } from 'next/server';
import { MarketIntelligenceService } from '@/lib/services/pricing-intel/MarketIntelligenceService';
import { getOrgId } from '../_helpers';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const competitorId = searchParams.get('competitorId') || undefined;

    const intelligenceService = new MarketIntelligenceService();
    const gaps = await intelligenceService.identifyAssortmentGaps(orgId, competitorId);

    return NextResponse.json({ data: gaps, error: null });
  } catch (error) {
    console.error('Error identifying assortment gaps:', error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to identify assortment gaps',
        },
      },
      { status: 500 }
    );
  }
}
