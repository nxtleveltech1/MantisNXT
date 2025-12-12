import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DocumentConversionService } from '@/lib/services/sales';
import { getOrgId } from '../../../_helpers';

const convertSchema = z.object({
  created_by: z.string().uuid(),
  due_date: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proformaInvoiceId } = await context.params;
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = convertSchema.parse(body);

    const invoiceId = await DocumentConversionService.convertProformaInvoiceToInvoice(
      proformaInvoiceId,
      validated.created_by,
      validated.due_date || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        proforma_invoice_id: proformaInvoiceId,
        invoice_id: invoiceId,
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

    console.error('Error in POST /api/v1/sales/proforma-invoices/[id]/convert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert proforma invoice',
      },
      { status: 500 }
    );
  }
}

