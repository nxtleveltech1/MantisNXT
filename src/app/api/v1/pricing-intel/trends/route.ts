import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { MarketIntelligenceService } from '@/lib/services/pricing-intel/MarketIntelligenceService'
import { ProductMatchService } from '@/lib/services/pricing-intel/ProductMatchService'
import { getOrgId } from '../_helpers'

const requestSchema = z.object({
  productId: z.string().uuid(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  forecastDays: z.number().min(7).max(365).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request)
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const forecastDays = parseInt(searchParams.get('forecastDays') || '30', 10)

    if (!productId) {
      return NextResponse.json(
        {
          data: null,
          error: { code: 'MISSING_PRODUCT_ID', message: 'productId query parameter is required' },
        },
        { status: 400 }
      )
    }

    const validated = requestSchema.parse({ productId, startDate, endDate, forecastDays })

    // Get product matches
    const matchService = new ProductMatchService()
    const matches = await matchService.listMatches(orgId, {
      internalProductId: validated.productId,
      status: 'matched',
    })

    if (matches.length === 0) {
      return NextResponse.json({
        data: {
          historical: [],
          forecast: [],
          seasonalPatterns: [],
          trends: {},
        },
        error: null,
      })
    }

    const matchIds = matches.map((m) => m.match_id)
    const start = validated.startDate ? new Date(validated.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const end = validated.endDate ? new Date(validated.endDate) : new Date()

    // Get historical price snapshots
    const { query } = await import('@/lib/database')
    const { PRICING_TABLES } = await import('@/lib/db/pricing-schema')

    const historicalSnapshots = await query<{
      observed_at: Date
      pricing: unknown
      competitor_id: string
    }>(
      `
        SELECT observed_at, pricing, competitor_id
        FROM ${PRICING_TABLES.MARKET_INTEL_SNAPSHOT}
        WHERE org_id = $1
          AND match_id = ANY($2::uuid[])
          AND observed_at BETWEEN $3 AND $4
        ORDER BY observed_at ASC
      `,
      [orgId, matchIds, start, end]
    )

    // Aggregate prices by date (daily average)
    const dailyPrices = new Map<string, number[]>()
    for (const snapshot of historicalSnapshots.rows) {
      const pricing = snapshot.pricing as Record<string, unknown>
      const price = (pricing?.sale_price || pricing?.regular_price) as number | undefined
      if (!price || typeof price !== 'number') continue

      const dateKey = snapshot.observed_at.toISOString().split('T')[0]
      if (!dailyPrices.has(dateKey)) {
        dailyPrices.set(dateKey, [])
      }
      dailyPrices.get(dateKey)!.push(price)
    }

    // Calculate daily averages
    const historical = Array.from(dailyPrices.entries())
      .map(([date, prices]) => ({
        date,
        averagePrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        dataPoints: prices.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Simple linear trend calculation
    if (historical.length >= 2) {
      const prices = historical.map((h) => h.averagePrice)
      const dates = historical.map((h, i) => i)

      const n = prices.length
      const sumX = dates.reduce((sum, x) => sum + x, 0)
      const sumY = prices.reduce((sum, y) => sum + y, 0)
      const sumXY = dates.reduce((sum, x, i) => sum + x * prices[i], 0)
      const sumXX = dates.reduce((sum, x) => sum + x * x, 0)

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n

      // Generate forecast
      const forecast: Array<{ date: string; predictedPrice: number; confidence: number }> = []
      const lastDate = new Date(historical[historical.length - 1].date)
      const lastIndex = dates.length - 1

      for (let i = 1; i <= validated.forecastDays; i++) {
        const forecastDate = new Date(lastDate)
        forecastDate.setDate(forecastDate.getDate() + i)
        const futureIndex = lastIndex + i

        // Linear projection
        const predictedPrice = slope * futureIndex + intercept

        // Confidence decreases over time
        const confidence = Math.max(0, 100 - (i / validated.forecastDays) * 50)

        forecast.push({
          date: forecastDate.toISOString().split('T')[0],
          predictedPrice: Math.max(0, predictedPrice),
          confidence: Math.round(confidence),
        })
      }

      // Detect seasonal patterns (simplified - check for repeating patterns)
      const seasonalPatterns: Array<{
        period: string
        averageChange: number
        frequency: number
      }> = []

      // Group by month to detect monthly patterns
      const monthlyAverages = new Map<number, number[]>()
      for (const point of historical) {
        const month = new Date(point.date).getMonth()
        if (!monthlyAverages.has(month)) {
          monthlyAverages.set(month, [])
        }
        monthlyAverages.get(month)!.push(point.averagePrice)
      }

      const avgPrice = sumY / n
      for (const [month, prices] of monthlyAverages.entries()) {
        const monthAvg = prices.reduce((sum, p) => sum + p, 0) / prices.length
        const change = ((monthAvg - avgPrice) / avgPrice) * 100

        if (Math.abs(change) > 5) {
          seasonalPatterns.push({
            period: new Date(2024, month, 1).toLocaleString('default', { month: 'long' }),
            averageChange: Math.round(change * 100) / 100,
            frequency: prices.length,
          })
        }
      }

      return NextResponse.json({
        data: {
          historical,
          forecast,
          seasonalPatterns,
          trends: {
            slope: Math.round(slope * 10000) / 10000,
            intercept: Math.round(intercept * 100) / 100,
            direction: slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'stable',
            strength: Math.abs(slope) > 0.1 ? 'strong' : Math.abs(slope) > 0.01 ? 'moderate' : 'weak',
          },
        },
        error: null,
      })
    }

    return NextResponse.json({
      data: {
        historical,
        forecast: [],
        seasonalPatterns: [],
        trends: {},
      },
      error: null,
    })
  } catch (error) {
    console.error('Error analyzing trends:', error)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze trends',
        },
      },
      { status: 500 }
    )
  }
}

