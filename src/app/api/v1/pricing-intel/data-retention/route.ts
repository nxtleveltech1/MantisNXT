import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DataRetentionService } from '@/lib/services/pricing-intel/DataRetentionService'
import { getOrgId } from '../_helpers'

const policySchema = z.object({
  retention_days_snapshots: z.number().min(30).max(3650),
  retention_days_alerts: z.number().min(30).max(3650),
  retention_days_jobs: z.number().min(30).max(3650),
  archival_strategy: z.enum(['delete', 'archive', 'compress']),
})

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request)
    const service = new DataRetentionService()
    const policy = await service.getPolicy(orgId)

    return NextResponse.json({
      data: policy || {
        retention_days_snapshots: 365,
        retention_days_alerts: 180,
        retention_days_jobs: 90,
        archival_strategy: 'delete',
      },
      error: null,
    })
  } catch (error) {
    console.error('Error fetching retention policy:', error)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch retention policy',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const orgId = await getOrgId(request, body)

    const validated = policySchema.parse(body)
    const service = new DataRetentionService()

    const policy = await service.updatePolicy(orgId, validated)

    return NextResponse.json({ data: policy, error: null })
  } catch (error) {
    console.error('Error updating retention policy:', error)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update retention policy',
        },
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const orgId = await getOrgId(request)
    const service = new DataRetentionService()

    const result = await service.executeRetentionPolicy(orgId)

    return NextResponse.json({ data: result, error: null })
  } catch (error) {
    console.error('Error executing retention policy:', error)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute retention policy',
        },
      },
      { status: 500 }
    )
  }
}






