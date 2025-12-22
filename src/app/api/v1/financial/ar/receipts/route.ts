/**
 * AR Receipts API
 * GET /api/v1/financial/ar/receipts - List receipts
 * POST /api/v1/financial/ar/receipts - Create receipt
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ARService } from '@/lib/services/financial';
import { getOrgId } from '../_helpers';
import { createARReceiptSchema } from '@/lib/validation/financial';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);

    // List receipts logic would go here
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch receipts',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createARReceiptSchema.parse({
      ...body,
      org_id: orgId,
    });

    const receipt = await ARService.recordReceipt(validated);

    return NextResponse.json(
      {
        success: true,
        data: receipt,
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

    console.error('Error creating receipt:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create receipt',
      },
      { status: 500 }
    );
  }
}

