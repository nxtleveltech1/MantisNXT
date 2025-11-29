import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { MarketIntelligenceService } from '@/lib/services/pricing-intel/MarketIntelligenceService'
import { ProductMatchService } from '@/lib/services/pricing-intel/ProductMatchService'
import { getOrgId } from '../_helpers'

const requestSchema = z.object({
  productId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request)
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        {
          data: null,
          error: { code: 'MISSING_PRODUCT_ID', message: 'productId query parameter is required' },
        },
        { status: 400 }
      )
    }

    const validated = requestSchema.parse({ productId })

    // Get product matches for this product
    const matchService = new ProductMatchService()
    const matches = await matchService.listMatches(orgId, {
      internalProductId: validated.productId,
      status: 'matched',
    })

    if (matches.length === 0) {
      return NextResponse.json({
        data: {
          internalPrice: 0,
          competitorPrices: [],
          rank: 1,
          percentile: 50,
          spread: 0,
          marketMedian: 0,
          marketAverage: 0,
          position: 'at_median' as const,
        },
        error: null,
      })
    }

    const matchIds = matches.map((m) => m.match_id)

    // Get price positioning
    const intelligenceService = new MarketIntelligenceService()
    const positioning = await intelligenceService.getPricePositioning(orgId, validated.productId, matchIds)

    if (!positioning) {
      return NextResponse.json({
        data: {
          internalPrice: 0,
          competitorPrices: [],
          rank: 1,
          percentile: 50,
          spread: 0,
          marketMedian: 0,
          marketAverage: 0,
          position: 'at_median' as const,
        },
        error: null,
      })
    }

    return NextResponse.json({ data: positioning, error: null })
  } catch (error) {
    console.error('Error fetching price positioning:', error)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch price positioning',
        },
      },
      { status: 500 }
    )
  }
}





