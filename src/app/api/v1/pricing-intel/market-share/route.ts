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

    // Get product matches
    const matchService = new ProductMatchService()
    const matches = await matchService.listMatches(orgId, {
      internalProductId: validated.productId,
      status: 'matched',
    })

    if (matches.length === 0) {
      return NextResponse.json({ data: { marketShare: 0 }, error: null })
    }

    const matchIds = matches.map((m) => m.match_id)

    // Calculate market share
    const intelligenceService = new MarketIntelligenceService()
    const marketShare = await intelligenceService.calculateMarketShare(orgId, validated.productId, matchIds)

    return NextResponse.json({ data: { marketShare }, error: null })
  } catch (error) {
    console.error('Error calculating market share:', error)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to calculate market share',
        },
      },
      { status: 500 }
    )
  }
}





