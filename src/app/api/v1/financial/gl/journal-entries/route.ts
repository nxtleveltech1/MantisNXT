/**
 * General Ledger Journal Entries API
 * GET /api/v1/financial/gl/journal-entries - List journal entries
 * POST /api/v1/financial/gl/journal-entries - Create journal entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GLService } from '@/lib/services/financial';
import { getOrgId } from '../_helpers';
import { createJournalEntrySchema } from '@/lib/validation/financial';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);

    const filters = {
      period: searchParams.get('period') || undefined,
      fiscal_year: searchParams.get('fiscal_year') ? parseInt(searchParams.get('fiscal_year')!, 10) : undefined,
      is_posted: searchParams.get('is_posted') === 'true' ? true : searchParams.get('is_posted') === 'false' ? false : undefined,
      reference_type: searchParams.get('reference_type') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    };

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await GLService.getJournalEntries(orgId, filters, limit, offset);

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch journal entries',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createJournalEntrySchema.parse({
      ...body,
      org_id: orgId,
    });

    const entry = await GLService.createJournalEntry(validated);

    return NextResponse.json(
      {
        success: true,
        data: entry,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Error creating journal entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create journal entry',
      },
      { status: 500 }
    );
  }
}

