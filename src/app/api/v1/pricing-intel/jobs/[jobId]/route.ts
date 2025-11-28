import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { ScrapingJobService } from '@/lib/services/pricing-intel/ScrapingJobService'
import { getOrgId } from '../../_helpers'

const service = new ScrapingJobService()

const updateSchema = z.object({
  job_name: z.string().optional(),
  schedule_type: z.enum(['manual', 'cron', 'interval']).optional(),
  schedule_config: z.record(z.any()).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  priority: z.number().min(1).max(5).optional(),
  max_concurrency: z.number().min(1).max(20).optional(),
  rate_limit_per_min: z.number().min(1).max(600).optional(),
  next_run_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const body = await request.json()
    const payload = updateSchema.parse(body)
    const orgId = await getOrgId(request, body)
    const updated = await service.updateJob(orgId, params.jobId, {
      ...payload,
      next_run_at: payload.next_run_at ? new Date(payload.next_run_at) : undefined,
    })
    if (!updated) {
      return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ data: updated, error: null })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to update job' },
      { status: 400 },
    )
  }
}

