/**
 * Admin Loyalty Rules API - Activate Rule
 *
 * POST /api/v1/admin/loyalty/rules/[id]/activate - Activate a rule
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
} from '@/lib/auth/middleware';

// POST - Activate rule
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
    // const result = await LoyaltyRuleService.activate(id, user.organizationId);

    const mockResult = {
      id: id,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
      message: 'Rule activated successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
