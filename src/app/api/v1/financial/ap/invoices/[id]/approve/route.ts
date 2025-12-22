/**
 * Approve AP Invoice API
 * POST /api/v1/financial/ap/invoices/[id]/approve
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APService } from '@/lib/services/financial';
import { getOrgId } from '../../../../_helpers';

const approveInvoiceSchema = z.object({
  approved_by: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);
    const body = await request.json();

    const { approved_by } = approveInvoiceSchema.parse(body);

    const invoice = await APService.approveInvoice(id, orgId, approved_by);

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error approving invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve invoice',
      },
      { status: 500 }
    );
  }
}

