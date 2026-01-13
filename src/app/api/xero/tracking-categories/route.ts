/**
 * Xero Tracking Categories API
 *
 * GET /api/xero/tracking-categories - Fetch tracking categories
 * POST /api/xero/tracking-categories - Create tracking category
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  syncTrackingCategoryToXero,
  fetchTrackingCategoriesFromXero,
} from '@/lib/xero/sync/tracking-categories';
import { validateXeroRequest, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const result = await fetchTrackingCategoriesFromXero(orgId);
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Tracking Categories');
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const body = await request.json();
    const { name, options } = body as { name: string; options?: string[] };

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await syncTrackingCategoryToXero(orgId, { name, options });
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Tracking Categories');
  }
}
