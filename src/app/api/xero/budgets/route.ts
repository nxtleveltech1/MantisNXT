/**
 * Xero Budgets API
 *
 * GET /api/xero/budgets
 *
 * Fetch financial budgets from Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchBudgetsFromXero } from '@/lib/xero/sync/budgets';
import { validateXeroRequest, validateReportParams, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const params = validateReportParams(request.nextUrl.searchParams);
    if (params instanceof NextResponse) return params;

    const { fromDate, toDate } = params;

    const result = await fetchBudgetsFromXero(orgId, {
      dateFrom: fromDate,
      dateTo: toDate,
    });

    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Budgets');
  }
}
