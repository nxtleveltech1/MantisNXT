import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { InvoiceService } from '@/lib/services/sales';
import { getOrgId } from '../_helpers';

const invoiceItemSchema = z.object({
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

const createInvoiceSchema = z.object({
  customer_id: z.string().uuid(),
  sales_order_id: z.string().uuid().optional().nullable(),
  proforma_invoice_id: z.string().uuid().optional().nullable(),
  document_number: z.string().optional(),
  status: z
    .enum(['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'])
    .optional(),
  currency: z.string().default('ZAR'),
  due_date: z.string().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  billing_address: z.record(z.unknown()).optional(),
  shipping_address: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  created_by: z.string().uuid().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || undefined;
    const customer_id = searchParams.get('customer_id') || undefined;
    const sales_order_id = searchParams.get('sales_order_id') || undefined;
    const overdue = searchParams.get('overdue') === 'true';

    const { data, count } = await InvoiceService.getInvoices(orgId, limit, offset, {
      status,
      customer_id,
      sales_order_id,
      overdue,
    });

    return NextResponse.json({
      success: true,
      data,
      total: count,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales/invoices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch invoices',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();

    const validated = createInvoiceSchema.parse(body);

    const invoice = await InvoiceService.createInvoice({
      ...validated,
      org_id: orgId,
    });

    return NextResponse.json(
      {
        success: true,
        data: invoice,
      },
      { status: 201 }
    );
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

    console.error('Error in POST /api/v1/sales/invoices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invoice',
      },
      { status: 500 }
    );
  }
}

