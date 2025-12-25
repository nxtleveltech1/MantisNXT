// UPDATE: [2025-12-25] Added DocuStore integration for invoice PDF storage

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/sales';
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
    
    // Check if we should store in DocuStore
    const storeInDocuStore = request.nextUrl.searchParams.get('store') === 'true';

    const invoice = await InvoiceService.getInvoiceById(id, orgId);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const items = await InvoiceService.getInvoiceItems(id);
    const customer = await SalesPDFService.getCustomerInfo(orgId, invoice.customer_id);

    const result = await SalesPDFService.generatePDF({
      document: {
        id: invoice.id,
        org_id: orgId,
        customer_id: invoice.customer_id,
        document_number: invoice.document_number,
        reference_number: invoice.reference_number,
        status: invoice.status,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        total_tax: invoice.total_tax,
        total: invoice.total,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        notes: invoice.notes,
        due_date: invoice.due_date,
        created_at: invoice.created_at,
        metadata: invoice.metadata,
      },
      items,
      customer: customer || {
        id: invoice.customer_id,
        name: invoice.customer_id,
      },
      documentKind: 'invoice',
      storeInDocuStore,
      userId,
    });

    // If stored, return metadata in headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.document_number}.pdf"`,
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
    console.error('Error in GET /api/v1/sales/invoices/[id]/pdf:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate PDF and store in DocuStore
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const userId = await getUserId(request).catch(() => undefined);

    const invoice = await InvoiceService.getInvoiceById(id, orgId);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const items = await InvoiceService.getInvoiceItems(id);
    const customer = await SalesPDFService.getCustomerInfo(orgId, invoice.customer_id);

    const result = await SalesPDFService.generatePDF({
      document: {
        id: invoice.id,
        org_id: orgId,
        customer_id: invoice.customer_id,
        document_number: invoice.document_number,
        reference_number: invoice.reference_number,
        status: invoice.status,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        total_tax: invoice.total_tax,
        total: invoice.total,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        notes: invoice.notes,
        due_date: invoice.due_date,
        created_at: invoice.created_at,
        metadata: invoice.metadata,
      },
      items,
      customer: customer || {
        id: invoice.customer_id,
        name: invoice.customer_id,
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
        documentNumber: invoice.document_number,
      },
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/v1/sales/invoices/[id]/pdf:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}


