/**
 * Admin Loyalty Rules API - Deactivate Rule
 *
 * POST /api/v1/admin/loyalty/rules/[id]/deactivate - Deactivate a rule
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
} from '@/lib/auth/middleware';

// POST - Deactivate rule
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


    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyRuleService.deactivate(
    //   id,
    //   user.organizationId
    // );

    const mockResult = {
      id: id,
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
      message: 'Rule deactivated successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
