/**
 * Admin Loyalty Redemptions API - Approve Redemption
 *
 * POST /api/v1/admin/loyalty/redemptions/[id]/approve - Approve a redemption
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
} from '@/lib/auth/middleware';

// Validation schema for approval
const approveSchema = z.object({
  notes: z.string().optional(),
});

// POST - Approve redemption
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


    // Parse body (optional notes)
    const body = await request.json().catch(() => ({}));
    const validated = approveSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await RewardRedemptionService.approve(
    //   id,
    //   user.organizationId,
    //   user.userId,
    //   validated.notes
    // );

    const mockResult = {
      id: id,
      status: 'approved',
      fulfillment_notes: validated.notes,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
      message: 'Redemption approved successfully',
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
