import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { QuotationService } from '@/lib/services/sales';
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

    const quotation = await QuotationService.getQuotationById(id, orgId);
    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    const items = await QuotationService.getQuotationItems(id);
    const customer = await getCustomer(orgId, quotation.customer_id);

    const meta = quotation.metadata ?? null;
    const salesperson =
      meta && typeof meta === 'object' && typeof meta.salesperson === 'string' ? meta.salesperson : null;

    const branding = await getPlatformBranding();
    const html = renderSalesDocumentHtml({
      kind: 'quotation',
      logoDataUri: branding.logoDataUri,
      accentHex: branding.accentHex,
      companyDisplayName: 'NXT Level Tech',
      customer: {
        name: customer?.name ?? quotation.customer_id,
        company: customer?.company ?? null,
        email: customer?.email ?? null,
        phone: customer?.phone ?? null,
        addressLines: normalizeAddressLines(customer?.address ?? null),
      },
      header: {
        documentNumber: quotation.document_number,
        status: quotation.status,
        currency: quotation.currency,
        issueDate: quotation.created_at,
        validUntil: quotation.valid_until ?? null,
        referenceNumber: quotation.reference_number ?? null,
        salesperson,
      },
      items,
      totals: {
        subtotal: quotation.subtotal,
        totalTax: quotation.total_tax,
        total: quotation.total,
      },
      notes: quotation.notes ?? null,
    });

    const pdfBuffer = await renderHtmlToPdfBuffer({ html });

    const filename = `${quotation.document_number}.pdf`;
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales/quotations/[id]/pdf:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}


