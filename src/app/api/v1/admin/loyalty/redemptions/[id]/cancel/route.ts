/**
 * Admin Loyalty Redemptions API - Cancel Redemption
 *
 * POST /api/v1/admin/loyalty/redemptions/[id]/cancel - Cancel a redemption
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
} from '@/lib/auth/middleware';

// Validation schema for cancellation
const cancelSchema = z.object({
  reason: z.string().min(1),
  refund_points: z.boolean().default(true),
});

// POST - Cancel redemption
export async function POST(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);


    // Parse and validate body
    const body = await request.json();
    const validated = cancelSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await RewardRedemptionService.cancel(
    //   id,
    //   user.organizationId,
    //   user.userId,
    //   validated.reason,
    //   validated.refund_points
    // );

    const mockResult = {
      id: id,
      status: 'cancelled',
      cancellation_reason: validated.reason,
      points_refunded: validated.refund_points,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
      message: 'Redemption cancelled successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return handleError(error);
  }
}
