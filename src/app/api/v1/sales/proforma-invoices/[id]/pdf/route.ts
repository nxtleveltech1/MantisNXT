// UPDATE: [2025-12-25] Created proforma invoice PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ProformaInvoiceService } from '@/lib/services/sales';
import { getOrgId, getUserId } from '../../../_helpers';
import { SalesPDFService } from '@/lib/services/sales/documents/sales-pdf-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const userId = await getUserId(request).catch(() => undefined);
    
    const storeInDocuStore = request.nextUrl.searchParams.get('store') === 'true';

    const proforma = await ProformaInvoiceService.getProformaInvoiceById(id, orgId);
    if (!proforma) {
      return NextResponse.json(
        { success: false, error: 'Proforma invoice not found' },
        { status: 404 }
      );
    }

    const items = await ProformaInvoiceService.getProformaInvoiceItems(id);
    const customer = await SalesPDFService.getCustomerInfo(orgId, proforma.customer_id);

    const result = await SalesPDFService.generatePDF({
      document: {
        id: proforma.id,
        org_id: orgId,
        customer_id: proforma.customer_id,
        document_number: proforma.document_number,
        reference_number: proforma.reference_number,
        status: proforma.status,
        currency: proforma.currency,
        subtotal: proforma.subtotal,
        total_tax: proforma.total_tax,
        total: proforma.total,
        notes: proforma.notes,
        created_at: proforma.created_at,
        metadata: proforma.metadata,
      },
      items,
      customer: customer || {
        id: proforma.customer_id,
        name: proforma.customer_id,
      },
      documentKind: 'invoice', // Uses invoice template with proforma styling
      storeInDocuStore,
      userId,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${proforma.document_number}.pdf"`,
      'Cache-Control': 'no-store, max-age=0',
    };
    
    if (result.documentId) {
      headers['X-DocuStore-Document-Id'] = result.documentId;
    }
    if (result.artifactId) {
      headers['X-DocuStore-Artifact-Id'] = result.artifactId;
    }

    return new NextResponse(result.pdfBuffer, { headers });
  } catch (error: unknown) {
    console.error('Error in GET /api/v1/sales/proforma-invoices/[id]/pdf:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const userId = await getUserId(request).catch(() => undefined);

    const proforma = await ProformaInvoiceService.getProformaInvoiceById(id, orgId);
    if (!proforma) {
      return NextResponse.json(
        { success: false, error: 'Proforma invoice not found' },
        { status: 404 }
      );
    }

    const items = await ProformaInvoiceService.getProformaInvoiceItems(id);
    const customer = await SalesPDFService.getCustomerInfo(orgId, proforma.customer_id);

    const result = await SalesPDFService.generatePDF({
      document: {
        id: proforma.id,
        org_id: orgId,
        customer_id: proforma.customer_id,
        document_number: proforma.document_number,
        reference_number: proforma.reference_number,
        status: proforma.status,
        currency: proforma.currency,
        subtotal: proforma.subtotal,
        total_tax: proforma.total_tax,
        total: proforma.total,
        notes: proforma.notes,
        created_at: proforma.created_at,
        metadata: proforma.metadata,
      },
      items,
      customer: customer || {
        id: proforma.customer_id,
        name: proforma.customer_id,
      },
      documentKind: 'invoice',
      storeInDocuStore: true,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        documentId: result.documentId,
        artifactId: result.artifactId,
        documentNumber: proforma.document_number,
      },
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/v1/sales/proforma-invoices/[id]/pdf:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

