import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ProformaInvoiceService } from '@/lib/services/sales';
import { getOrgId } from '../../_helpers';

const proformaInvoiceItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  supplier_product_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  tax_rate: z.number().min(0).max(1).default(0),
  tax_amount: z.number().nonnegative().default(0),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
  line_number: z.number().int().positive().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const updateProformaInvoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'cancelled', 'converted']).optional(),
  currency: z.string().optional(),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  billing_address: z.record(z.unknown()).optional(),
  shipping_address: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  updated_by: z.string().uuid().optional().nullable(),
  items: z.array(proformaInvoiceItemSchema).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);

    const proformaInvoice = await ProformaInvoiceService.getProformaInvoiceById(id, orgId);

    if (!proformaInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proforma invoice not found',
        },
        { status: 404 }
      );
    }

    const items = await ProformaInvoiceService.getProformaInvoiceItems(id);

    return NextResponse.json({
      success: true,
      data: {
        ...proformaInvoice,
        items,
      },
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales/proforma-invoices/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch proforma invoice',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = updateProformaInvoiceSchema.parse(body);

    const proformaInvoice = await ProformaInvoiceService.updateProformaInvoice(id, orgId, validated);

    return NextResponse.json({
      success: true,
      data: proformaInvoice,
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

    console.error('Error in PUT /api/v1/sales/proforma-invoices/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update proforma invoice',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);

    await ProformaInvoiceService.deleteProformaInvoice(id, orgId);

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/v1/sales/proforma-invoices/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete proforma invoice',
      },
      { status: 500 }
    );
  }
}

