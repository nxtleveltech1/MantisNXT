/**
 * Admin Loyalty Rules API - List & Create
 *
 * GET  /api/v1/admin/loyalty/rules - List all rules
 * POST /api/v1/admin/loyalty/rules - Create new rule
 *
 * @author Claude Code
 * @date 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateRequest,
  requireAdmin,
  handleError,
  getPaginationParams,
  formatPaginatedResponse,
} from '@/lib/auth/middleware';

// Validation schema for creating rule
const createRuleSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  trigger_type: z.enum([
    'order_placed',
    'referral',
    'review',
    'birthday',
    'anniversary',
    'signup',
    'social_share',
  ]),
  conditions: z.record(z.any()).default({}),
  points_multiplier: z.number().positive().default(1.0),
  bonus_points: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
  priority: z.number().int().default(0),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().nullable().optional(),
});

// GET - List all rules
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    // Pagination
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = getPaginationParams(searchParams);

    // Filters
    const programId = searchParams.get('program_id');
    const triggerType = searchParams.get('trigger_type');
    const isActive = searchParams.get('is_active');

    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyRuleService.list(user.organizationId, {
    //   programId,
    //   triggerType,
    //   isActive,
    //   limit,
    //   offset,
    // });

    const mockData = {
      rules: [],
      total: 0,
    };

    return NextResponse.json(formatPaginatedResponse(mockData.rules, mockData.total, page, limit));
  } catch (error) {
    return handleError(error);
  }
}

// POST - Create new rule
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    // Parse and validate body
    const body = await request.json();
    const validated = createRuleSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyRuleService.create({
    //   org_id: user.organizationId,
    //   ...validated,
    // });

    const mockResult = {
      id: 'mock-rule-id',
      org_id: user.organizationId,
      ...validated,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: mockResult,
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
