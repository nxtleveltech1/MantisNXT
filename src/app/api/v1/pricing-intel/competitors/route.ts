import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { CompetitorProfileService } from '@/lib/services/pricing-intel/CompetitorProfileService'
import { getOrgId } from '../_helpers'

const service = new CompetitorProfileService()

const competitorSchema = z.object({
  orgId: z.string().uuid().optional(),
  company_name: z.string().min(2),
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

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request)
    const competitors = await service.list(orgId)
    return NextResponse.json({ data: competitors, error: null })
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to load competitors',
        },
      },
      { status: 400 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = competitorSchema.parse(body)
    const orgId = await getOrgId(request, payload)
    const competitor = await service.create(orgId, {
      competitor_id: '',
      org_id: orgId,
      company_name: payload.company_name,
      website_url: payload.website_url,
      marketplace_listings: payload.marketplace_listings ?? [],
      social_profiles: payload.social_profiles ?? [],
      custom_data_sources: payload.custom_data_sources ?? [],
      default_currency: payload.default_currency ?? 'USD',
      proxy_policy: payload.proxy_policy ?? {},
      captcha_policy: payload.captcha_policy ?? {},
      robots_txt_behavior: payload.robots_txt_behavior ?? 'respect',
      notes: payload.notes,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: undefined,
      created_by: undefined,
      updated_by: undefined,
    })
    return NextResponse.json({ data: competitor, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create competitor',
        },
      },
      { status: 400 },
    )
  }
}

