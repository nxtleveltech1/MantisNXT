import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { CompetitorProfileService } from '@/lib/services/pricing-intel/CompetitorProfileService'
import { getOrgId } from '../../../_helpers'

const service = new CompetitorProfileService()

const sourceSchema = z.object({
  source_type: z.enum(['website', 'api', 'marketplace', 'custom']),
  label: z.string().optional(),
  endpoint_url: z.string().url(),
  auth_config: z.record(z.any()).optional(),
  rate_limit_config: z.record(z.any()).optional(),
  robots_txt_cache: z.record(z.any()).optional(),
  health_status: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function GET(request: NextRequest, { params }: { params: { competitorId: string } }) {
  try {
    const orgId = await getOrgId(request)
    const sources = await service.listDataSources(orgId, params.competitorId)
    return NextResponse.json({ data: sources, error: null })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to load sources' },
      { status: 400 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { competitorId: string } }) {
  try {
    const body = await request.json()
    const payload = sourceSchema.parse(body)
    const orgId = await getOrgId(request, body)
    const source = await service.addDataSource(orgId, params.competitorId, {
      data_source_id: '',
      competitor_id: params.competitorId,
      org_id: orgId,
      source_type: payload.source_type,
      label: payload.label,
      endpoint_url: payload.endpoint_url,
      auth_config: payload.auth_config ?? {},
      rate_limit_config: payload.rate_limit_config ?? {},
      robots_txt_cache: payload.robots_txt_cache,
      health_status: payload.health_status ?? 'unknown',
      metadata: payload.metadata ?? {},
      last_success_at: undefined,
      last_status: undefined,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return NextResponse.json({ data: source, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to add data source' },
      { status: 400 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { competitorId: string } }) {
  try {
    const orgId = await getOrgId(request)
    const sourceId = new URL(request.url).searchParams.get('dataSourceId')
    if (!sourceId) {
      return NextResponse.json(
        { data: null, error: 'dataSourceId query parameter required' },
        { status: 400 },
      )
    }
    await service.deleteDataSource(orgId, sourceId)
    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to delete data source',
      },
      { status: 400 },
    )
  }
}

