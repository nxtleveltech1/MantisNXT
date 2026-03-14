/**
 * Xero Manual Journals Sync API
 *
 * GET /api/xero/sync/manual-journals
 * POST /api/xero/sync/manual-journals
 *
 * List (GET) or sync (POST) manual journals to/from Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  syncManualJournalToXero,
  fetchManualJournalsFromXero,
} from '@/lib/xero/sync/manual-journals';
import { validateXeroRequest, validateSyncParams, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;
    const fromDate = request.nextUrl.searchParams.get('fromDate') || undefined;
    const toDate = request.nextUrl.searchParams.get('toDate') || undefined;

    const result = await fetchManualJournalsFromXero(orgId, {
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? 'Failed to fetch manual journals' },
        { status: 400 }
      );
    }

    const list = result.data.map((mj) => {
      const debits = (mj.JournalLines ?? []).filter((l) => (l.LineAmount ?? 0) > 0).reduce((s, l) => s + (l.LineAmount ?? 0), 0);
      const credits = (mj.JournalLines ?? []).filter((l) => (l.LineAmount ?? 0) < 0).reduce((s, l) => s + Math.abs(l.LineAmount ?? 0), 0);
      return {
        id: mj.ManualJournalID,
        entry_number: mj.Narration ?? mj.ManualJournalID ?? '',
        description: mj.Narration ?? '',
        date: (mj as { JournalDate?: string }).JournalDate ?? (mj as { Date?: string }).Date,
        is_posted: mj.Status === 'POSTED',
        total_debits: debits,
        total_credits: credits,
      };
    });

    return NextResponse.json({ success: true, data: list, count: list.length });
  } catch (error) {
    return handleApiError(error, 'Xero Fetch Manual Journals');
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

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

    switch (type) {
      case 'create': {
        const result = await syncManualJournalToXero(
          orgId,
          data as Parameters<typeof syncManualJournalToXero>[1]
        );
        return successResponse(result);
      }

      case 'fetch': {
        const options = data as {
          fromDate?: string;
          toDate?: string;
        };
        const result = await fetchManualJournalsFromXero(orgId, {
          fromDate: options?.fromDate ? new Date(options.fromDate) : undefined,
          toDate: options?.toDate ? new Date(options.toDate) : undefined,
        });
        return successResponse(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid sync type. Expected: create or fetch' },
          { status: 400 }
        );
    }

  } catch (error) {
    return handleApiError(error, 'Xero Sync Manual Journals');
  }
}
