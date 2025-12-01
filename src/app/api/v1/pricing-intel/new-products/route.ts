import { NextRequest, NextResponse } from 'next/server';
import { MarketIntelligenceService } from '@/lib/services/pricing-intel/MarketIntelligenceService';
import { getOrgId } from '../_helpers';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const competitorId = searchParams.get('competitorId') || undefined;
    const sinceDays = parseInt(searchParams.get('sinceDays') || '30', 10);

    const intelligenceService = new MarketIntelligenceService();
    const newProducts = await intelligenceService.detectNewProducts(orgId, competitorId, sinceDays);

    return NextResponse.json({ data: newProducts, error: null });
  } catch (error) {
    console.error('Error detecting new products:', error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to detect new products',
        },
      },
      { status: 500 }
    );
  }
}





