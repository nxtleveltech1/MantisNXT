import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DocumentConversionService } from '@/lib/services/sales';
import { getOrgId } from '../../../_helpers';

const convertSchema = z.object({
  created_by: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quotationId } = await context.params;
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = convertSchema.parse(body);

    const salesOrderId = await DocumentConversionService.convertQuotationToSalesOrder(
      quotationId,
      validated.created_by
    );

    return NextResponse.json({
      success: true,
      data: {
        quotation_id: quotationId,
        sales_order_id: salesOrderId,
      },
    });
  } catch (error: unknown) {
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

    console.error('Error in POST /api/v1/sales/quotations/[id]/convert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert quotation',
      },
      { status: 500 }
    );
  }
}

