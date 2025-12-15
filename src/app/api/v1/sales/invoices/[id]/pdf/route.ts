import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/sales';
import { query } from '@/lib/database/unified-connection';
import { getOrgId } from '../../../_helpers';
import { getPlatformBranding } from '@/lib/services/pdf/platform-branding';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { renderSalesDocumentHtml } from '@/lib/services/sales/documents/sales-document-template';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CustomerRow = {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: unknown | null;
};

function normalizeAddressLines(address: unknown): string[] | null {
  if (!address || typeof address !== 'object') return null;
  const a = address as Record<string, unknown>;

  const parts = [
    typeof a.street === 'string' ? a.street : null,
    typeof a.city === 'string' ? a.city : null,
    typeof a.state === 'string' ? a.state : null,
    typeof a.postal_code === 'string' ? a.postal_code : null,
    typeof a.country === 'string' ? a.country : null,
  ].filter((x): x is string => Boolean(x && x.trim()));

  return parts.length > 0 ? parts : null;
}

async function getCustomer(orgId: string, customerId: string): Promise<CustomerRow | null> {
  const result = await query<CustomerRow>(
    `SELECT id, org_id, name, email, phone, company, address
     FROM customer
     WHERE id = $1 AND org_id = $2`,
    [customerId, orgId]
  );
  return result.rows[0] ?? null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);

    const invoice = await InvoiceService.getInvoiceById(id, orgId);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const items = await InvoiceService.getInvoiceItems(id);
    const customer = await getCustomer(orgId, invoice.customer_id);

    const meta = invoice.metadata ?? null;
    const source = meta && typeof meta === 'object' && typeof meta.source === 'string' ? meta.source : null;
    const salesperson =
      meta && typeof meta === 'object' && typeof meta.salesperson === 'string' ? meta.salesperson : null;

    const branding = await getPlatformBranding();
    const html = renderSalesDocumentHtml({
      kind: 'invoice',
      logoDataUri: branding.logoDataUri,
      accentHex: branding.accentHex,
      companyDisplayName: 'NXT Level Tech',
      customer: {
        name: customer?.name ?? invoice.customer_id,
        company: customer?.company ?? null,
        email: customer?.email ?? null,
        phone: customer?.phone ?? null,
        addressLines: normalizeAddressLines(customer?.address ?? null),
      },
      header: {
        documentNumber: invoice.document_number,
        status: invoice.status,
        currency: invoice.currency,
        issueDate: invoice.created_at,
        dueDate: invoice.due_date ?? null,
        referenceNumber: invoice.reference_number ?? null,
        source,
        salesperson,
      },
      items,
      totals: {
        subtotal: invoice.subtotal,
        totalTax: invoice.total_tax,
        total: invoice.total,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
      },
      notes: invoice.notes ?? null,
    });

    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    const filename = `${invoice.document_number}.pdf`;
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales/invoices/[id]/pdf:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}


