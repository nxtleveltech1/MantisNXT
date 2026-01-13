/**
 * Xero History and Notes API
 *
 * POST /api/xero/history - Add history note to entity
 * GET /api/xero/history - Fetch history records for entity
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  addHistoryNoteToXero,
  fetchHistoryRecordsFromXero,
} from '@/lib/xero/sync/history-notes';
import { validateXeroRequest, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType') as 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item';
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId query parameters are required' },
        { status: 400 }
      );
    }

    const result = await fetchHistoryRecordsFromXero(orgId, entityType, entityId);
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero History');
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    const body = await request.json();
    const { entityType, entityId, note } = body as {
      entityType: 'invoice' | 'credit_note' | 'quote' | 'contact' | 'bank_transaction' | 'item';
      entityId: string;
      note: string;
    };

    if (!entityType || !entityId || !note) {
      return NextResponse.json(
        { error: 'entityType, entityId, and note are required' },
        { status: 400 }
      );
    }

    const result = await addHistoryNoteToXero(orgId, entityType, entityId, note);
    return successResponse(result);

  } catch (error) {
    return handleApiError(error, 'Xero History');
  }
}
