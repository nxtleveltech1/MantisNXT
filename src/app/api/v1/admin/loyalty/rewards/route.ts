/**
 * Admin Loyalty Rewards API - List & Create
 *
 * GET  /api/v1/admin/loyalty/rewards - List all rewards
 * POST /api/v1/admin/loyalty/rewards - Create new reward
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
  getPaginationParams,
  formatPaginatedResponse,
} from '@/lib/auth/middleware';

// Validation schema for creating reward
const createRewardSchema = z.object({
  program_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  reward_type: z.enum([
    'points',
    'discount',
    'cashback',
    'free_shipping',
    'upgrade',
    'gift',
  ]),
  points_required: z.number().int().positive(),
  monetary_value: z.number().positive().nullable().optional(),
  max_redemptions_per_customer: z.number().int().positive().nullable().optional(),
  stock_quantity: z.number().int().nonnegative().nullable().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  terms_conditions: z.record(z.any()).optional(),
  image_url: z.string().url().nullable().optional(),
});

// GET - List all rewards
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
    const rewardType = searchParams.get('reward_type');
    const isActive = searchParams.get('is_active');
    const isFeatured = searchParams.get('is_featured');
    const programId = searchParams.get('program_id');
    const minPoints = searchParams.get('min_points');
    const maxPoints = searchParams.get('max_points');

    // TODO: Replace with actual service call when Team B completes services
    // const result = await RewardCatalogService.list(user.organizationId, {
    //   rewardType,
    //   isActive,
    //   isFeatured,
    //   programId,
    //   minPoints,
    //   maxPoints,
    //   limit,
    //   offset,
    // });

    const mockData = {
      rewards: [],
      total: 0,
    };

    return NextResponse.json(
      formatPaginatedResponse(mockData.rewards, mockData.total, page, limit)
    );
  } catch (error) {
    return handleError(error);
  }
}

// POST - Create new reward
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    // Parse and validate body
    const body = await request.json();
    const validated = createRewardSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await RewardCatalogService.create({
    //   org_id: user.organizationId,
    //   ...validated,
    // });

    const mockResult = {
      id: 'mock-reward-id',
      org_id: user.organizationId,
      ...validated,
      redemption_count: 0,
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
