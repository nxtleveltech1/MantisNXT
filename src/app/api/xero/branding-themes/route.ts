/**
 * Xero Branding Themes API
 *
 * GET /api/xero/branding-themes - Fetch branding themes
 * GET /api/xero/branding-themes/[id]/payment-services - Fetch payment services
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchBrandingThemesFromXero,
  fetchPaymentServicesFromXero,
} from '@/lib/xero/sync/branding-themes';
import { validateXeroRequest, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    // If ID provided, fetch payment services for that theme
    if (id) {
      const result = await fetchPaymentServicesFromXero(orgId, id);
      return successResponse(result);
    }

    // Otherwise fetch all branding themes
    const result = await fetchBrandingThemesFromXero(orgId);
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Branding Themes');
  }
}
