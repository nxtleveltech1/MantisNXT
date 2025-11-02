/**
 * Admin Loyalty Rules API - Single Rule
 *
 * GET    /api/v1/admin/loyalty/rules/[id] - Get rule details
 * PATCH  /api/v1/admin/loyalty/rules/[id] - Update rule
 * DELETE /api/v1/admin/loyalty/rules/[id] - Delete rule
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

// Validation schema for updating rule
const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  trigger_type: z
    .enum([
      'order_placed',
      'referral',
      'review',
      'birthday',
      'anniversary',
      'signup',
      'social_share',
    ])
    .optional(),
  conditions: z.record(z.any()).optional(),
  points_multiplier: z.number().positive().optional(),
  bonus_points: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
  priority: z.number().int().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().nullable().optional(),
});

// GET - Get rule details
export async function GET(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);


    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyRuleService.getById(id, user.organizationId);

    const mockResult = {
      id: id,
      org_id: user.organizationId,
      program_id: 'program-1',
      name: 'Large Order Bonus',
      description: 'Extra points for orders over $500',
      trigger_type: 'order_placed',
      conditions: {
        min_order_amount: 500,
      },
      points_multiplier: 1.5,
      bonus_points: 100,
      is_active: true,
      priority: 10,
      valid_from: new Date().toISOString(),
      valid_until: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
    });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH - Update rule
export async function PATCH(
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
    const validated = updateRuleSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyRuleService.update(
    //   id,
    //   user.organizationId,
    //   validated
    // );

    const mockResult = {
      id: id,
      org_id: user.organizationId,
      ...validated,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
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

// DELETE - Delete rule
export async function DELETE(
  request: NextRequest,

  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);


    // TODO: Replace with actual service call when Team B completes services
    // await LoyaltyRuleService.delete(id, user.organizationId);

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
