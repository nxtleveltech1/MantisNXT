import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { ProductMatchService } from '@/lib/services/pricing-intel/ProductMatchService'
import { getOrgId } from '../../_helpers'

const service = new ProductMatchService()

const statusSchema = z.object({
  status: z.enum(['matched', 'rejected']),
  reviewer_id: z.string().uuid().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const body = await request.json()
    const payload = statusSchema.parse(body)
    const orgId = await getOrgId(request, body)
    await service.updateStatus(orgId, params.matchId, payload.status, payload.reviewer_id)
    return NextResponse.json({ data: { updated: true }, error: null })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to update status' },
      { status: 400 },
    )
  }
}

