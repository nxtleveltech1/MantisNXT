/**
 * Customer Loyalty API - Enrollment
 *
 * POST /api/v1/customers/[id]/loyalty/enroll - Enroll customer in loyalty program
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateRequest,
  authorizeCustomerAccess,
  handleError,
} from '@/lib/auth/middleware';

// Validation schema for enrollment
const enrollSchema = z.object({
  program_id: z.string().uuid().optional(),
  referral_code: z.string().optional(),
});

// POST - Enroll customer in loyalty program
export async function POST(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Customer access check
    await authorizeCustomerAccess(user, id);


    // Parse body
    const body = await request.json().catch(() => ({}));
    const validated = enrollSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await CustomerLoyaltyService.enroll(
    //   id,
    //   user.organizationId,
    //   validated.program_id,
    //   validated.referral_code
    // );

    const mockResult = {
      customer_id: id,
      program_id: validated.program_id || 'default-program-id',
      current_tier: 'bronze',
      points_balance: 0,
      signup_bonus_awarded: 100,
      referral_bonus_awarded: validated.referral_code ? 50 : 0,
      enrolled_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: mockResult,
        message: 'Successfully enrolled in loyalty program',
      },
      { status: 201 }
    );
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
