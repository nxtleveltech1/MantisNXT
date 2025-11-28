import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { CompetitorProfileService } from '@/lib/services/pricing-intel/CompetitorProfileService'
import { getOrgId } from '../../_helpers'

const service = new CompetitorProfileService()

const updateSchema = z.object({
  company_name: z.string().min(2).optional(),
  website_url: z.string().url().optional(),
  marketplace_listings: z.array(z.record(z.any())).optional(),
  social_profiles: z.array(z.record(z.any())).optional(),
  custom_data_sources: z.array(z.record(z.any())).optional(),
  default_currency: z.string().length(3).optional(),
  proxy_policy: z.record(z.any()).optional(),
  captcha_policy: z.record(z.any()).optional(),
  robots_txt_behavior: z.enum(['respect', 'ignore', 'custom']).optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { competitorId: string } }) {
  try {
    const orgId = await getOrgId(request)
    const competitor = await service.get(orgId, params.competitorId)
    if (!competitor) {
      return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ data: competitor, error: null })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to fetch competitor' },
      { status: 400 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { competitorId: string } }) {
  try {
    const body = await request.json()
    const payload = updateSchema.parse(body)
    const orgId = await getOrgId(request, body)
    const updated = await service.update(orgId, params.competitorId, payload)
    if (!updated) {
      return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ data: updated, error: null })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to update competitor' },
      { status: 400 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { competitorId: string } }) {
  try {
    const orgId = await getOrgId(request)
    await service.archive(orgId, params.competitorId)
    return NextResponse.json({ data: { archived: true }, error: null })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to archive competitor' },
      { status: 400 },
    )
  }
}

