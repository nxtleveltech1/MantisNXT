/**
 * Xero Credit Notes Sync API
 * 
 * POST /api/xero/sync/credit-notes
 * GET /api/xero/sync/credit-notes
 * 
 * Sync credit notes to/from Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  syncCreditNoteToXero,
  fetchCreditNotesFromXero,
} from '@/lib/xero/sync/credit-notes';
import { validateXeroRequest, validateSyncParams, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function POST(request: NextRequest) {
  try {
    // Validate request
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const params = validateSyncParams(body);
    if (params instanceof NextResponse) return params;

    const { type, data } = params;

    if (type === 'sync') {
      const result = await syncCreditNoteToXero(
        orgId,
        data as Parameters<typeof syncCreditNoteToXero>[1]
      );
      return successResponse(result);
    }

    if (type === 'fetch') {
      const options = data as {
        type?: 'ACCRECCREDIT' | 'ACCPAYCREDIT';
        status?: string;
        modifiedAfter?: string;
      };
      const result = await fetchCreditNotesFromXero(orgId, {
        type: options?.type,
        status: options?.status,
        modifiedAfter: options?.modifiedAfter ? new Date(options.modifiedAfter) : undefined,
      });
      return successResponse(result);
    }

    return NextResponse.json(
      { error: 'Invalid sync type. Expected: sync or fetch' },
      { status: 400 }
    );

  } catch (error) {
    return handleApiError(error, 'Xero Sync Credit Notes');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate request
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'ACCRECCREDIT' | 'ACCPAYCREDIT' | null;
    const status = searchParams.get('status') || undefined;
    const modifiedAfter = searchParams.get('modifiedAfter') || undefined;

    const result = await fetchCreditNotesFromXero(orgId, {
      type: type || undefined,
      status,
      modifiedAfter: modifiedAfter ? new Date(modifiedAfter) : undefined,
    });

    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero Fetch Credit Notes');
  }
}
