import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { ScrapingJobService } from '@/lib/services/pricing-intel/ScrapingJobService';
import { getOrgId } from '../_helpers';

const service = new ScrapingJobService();

const jobSchema = z.object({
  orgId: z.string().uuid().optional(),
  competitor_id: z.string().uuid().optional(),
  job_name: z.string().min(3),
  schedule_type: z.enum(['manual', 'cron', 'interval']).default('manual'),
  schedule_config: z.record(z.any()).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  priority: z.number().min(1).max(5).optional(),
  max_concurrency: z.number().min(1).max(20).optional(),
  rate_limit_per_min: z.number().min(1).max(600).optional(),
  next_run_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const jobs = await service.listJobs(orgId);
    return NextResponse.json({ data: jobs, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to list jobs' },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = jobSchema.parse(body);
    const orgId = await getOrgId(request, body);
    const job = await service.createJob(orgId, {
      job_id: '',
      org_id: orgId,
      competitor_id: payload.competitor_id,
      job_name: payload.job_name,
      schedule_type: payload.schedule_type,
      schedule_config: payload.schedule_config ?? {},
      status: payload.status ?? 'active',
      priority: payload.priority ?? 3,
      max_concurrency: payload.max_concurrency ?? 5,
      rate_limit_per_min: payload.rate_limit_per_min ?? 60,
      next_run_at: payload.next_run_at ? new Date(payload.next_run_at) : null,
      metadata: payload.metadata ?? {},
      created_by: undefined,
      updated_by: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      last_run_at: undefined,
      last_status: undefined,
    });
    return NextResponse.json({ data: job, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 400 }
    );
  }
}
