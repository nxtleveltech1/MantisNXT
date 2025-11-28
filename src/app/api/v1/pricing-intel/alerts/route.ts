import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { AlertService } from '@/lib/services/pricing-intel/AlertService'
import { getOrgId } from '../_helpers'

const service = new AlertService()

const updateSchema = z.object({
  status: z.enum(['acknowledged', 'resolved']),
  remediation_status: z.string().optional(),
  alert_id: z.string().uuid(),
  reviewer_id: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request)
    const status = new URL(request.url).searchParams.get('status') ?? undefined
    const alerts = await service.list(orgId, status ?? undefined)
    return NextResponse.json({ data: alerts, error: null })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to load alerts' },
      { status: 400 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = updateSchema.parse(body)
    const orgId = await getOrgId(request, body)
    if (payload.status === 'acknowledged') {
      await service.acknowledge(orgId, payload.alert_id, payload.reviewer_id)
    } else {
      await service.resolve(orgId, payload.alert_id, payload.remediation_status ?? 'completed')
    }
    return NextResponse.json({ data: { updated: true }, error: null })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to update alert' },
      { status: 400 },
    )
  }
}

