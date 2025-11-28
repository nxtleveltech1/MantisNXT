import { NextResponse, type NextRequest } from 'next/server'

import { MarketIntelligenceService } from '@/lib/services/pricing-intel/MarketIntelligenceService'
import { getOrgId } from '../_helpers'

const service = new MarketIntelligenceService()

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request)
    const url = new URL(request.url)
    const format = (url.searchParams.get('format') ?? 'json') as 'json' | 'csv'
    const competitorId = url.searchParams.get('competitorId') ?? undefined
    const payload = await service.exportSnapshots(orgId, format, { competitorId })

    if (format === 'csv') {
      return new NextResponse(payload, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="competitive-export.csv"',
        },
      })
    }

    return NextResponse.json(JSON.parse(payload))
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to export snapshots',
      },
      { status: 400 },
    )
  }
}

