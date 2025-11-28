import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CompetitorProfileService } from '@/lib/services/pricing-intel/CompetitorProfileService'
import { getOrgId } from '../../_helpers'

const bulkImportSchema = z.object({
  competitors: z.array(
    z.object({
      company_name: z.string().min(1),
      website_url: z.string().url().optional(),
      default_currency: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const orgId = await getOrgId(request, body)

    const validated = bulkImportSchema.parse(body)

    const service = new CompetitorProfileService()
    const results = {
      successful: [] as Array<{ competitor_id: string; company_name: string }>,
      failed: [] as Array<{ company_name: string; error: string }>,
    }

    for (const competitor of validated.competitors) {
      try {
        const created = await service.create(orgId, competitor)
        results.successful.push({
          competitor_id: created.competitor_id,
          company_name: created.company_name,
        })
      } catch (error) {
        results.failed.push({
          company_name: competitor.company_name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      data: {
        total: validated.competitors.length,
        successful: results.successful.length,
        failed: results.failed.length,
        results,
      },
      error: null,
    })
  } catch (error) {
    console.error('Error bulk importing competitors:', error)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to bulk import competitors',
        },
      },
      { status: 500 }
    )
  }
}

