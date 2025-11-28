import { NextResponse, type NextRequest } from 'next/server'

import { MarketIntelligenceService } from '@/lib/services/pricing-intel/MarketIntelligenceService'
import { getOrgId } from '../_helpers'

const service = new MarketIntelligenceService()

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request)
    const url = new URL(request.url)
    const competitorId = url.searchParams.get('competitorId') ?? undefined
    const limit = url.searchParams.get('limit')
    const format = (url.searchParams.get('format') ?? 'json') as 'json' | 'csv'

    if (format === 'csv') {
      const csv = await service.exportSnapshots(orgId, 'csv', { competitorId })
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="market-intel.csv"',
        },
      })
    }

    const snapshots = await service.listSnapshots(orgId, {
      competitorId,
      limit: limit ? Number(limit) : undefined,
    })
    return NextResponse.json({ data: snapshots, error: null })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to fetch snapshots' },
      { status: 400 },
    )
  }
}

