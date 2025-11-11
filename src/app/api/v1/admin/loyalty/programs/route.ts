/**
 * Admin Loyalty Programs API - List & Create
 *
 * GET  /api/v1/admin/loyalty/programs - List all programs
 * POST /api/v1/admin/loyalty/programs - Create new program
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
  getPaginationParams,
  formatPaginatedResponse,
} from '@/lib/auth/middleware';

// Validation schema for creating program
const createProgramSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  earn_rate: z.number().positive().default(1.0),
  tier_thresholds: z
    .object({
      bronze: z.number().default(0),
      silver: z.number().default(1000),
      gold: z.number().default(5000),
      platinum: z.number().default(15000),
      diamond: z.number().default(50000),
    })
    .optional(),
  tier_benefits: z.record(z.any()).optional(),
  points_expiry_days: z.number().positive().nullable().optional(),
});

// GET - List all programs
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
    const isActive = searchParams.get('is_active');

    // TODO: Replace with actual service call when Team B completes services
    // For now, return mock data structure
    const mockData = {
      programs: [],
      total: 0,
    };

    return NextResponse.json(
      formatPaginatedResponse(mockData.programs, mockData.total, page, limit)
    );
  } catch (error) {
    return handleError(error);
  }
}

// POST - Create new program
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Authorization - Admin only
    await requireAdmin(user);

    // Parse and validate body
    const body = await request.json();
    const validated = createProgramSchema.parse(body);

    // TODO: Replace with actual service call when Team B completes services
    // const result = await LoyaltyProgramService.create({
    //   org_id: user.organizationId,
    //   ...validated,
    // });

    const mockResult = {
      id: 'mock-program-id',
      ...validated,
      org_id: user.organizationId,
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
