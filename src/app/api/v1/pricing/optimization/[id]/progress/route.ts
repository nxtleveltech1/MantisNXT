/**
 * Optimization Progress API
 *
 * GET /api/v1/pricing/optimization/[id]/progress
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PricingOptimizationService } from '@/lib/services/PricingOptimizationService';
import { requireAuthOrg } from '@/lib/auth/require-org';
import { handleError } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireAuthOrg(request);
    const { id } = await context.params;

    const progress = await PricingOptimizationService.getProgress(orgId, id);

    if (!progress) {
      return NextResponse.json({ success: false, error: 'Optimization run not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: progress });
  } catch (error) {
    return handleError(error);
  }
}
