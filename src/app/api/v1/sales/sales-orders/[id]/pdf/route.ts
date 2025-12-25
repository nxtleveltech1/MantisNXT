// UPDATE: [2025-12-25] Created sales order PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SalesOrderService } from '@/lib/services/sales';
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

    const salesOrder = await SalesOrderService.getSalesOrderById(id, orgId);
    if (!salesOrder) {
      return NextResponse.json(
        { success: false, error: 'Sales order not found' },
        { status: 404 }
      );
    }

    const items = await SalesOrderService.getSalesOrderItems(id);
    const customer = await SalesPDFService.getCustomerInfo(orgId, salesOrder.customer_id);

    // Map sales order items to standard format
    const mappedItems = items.map((item: Record<string, unknown>, index: number) => ({
      line_number: index + 1,
      sku: item.sku as string | undefined,
      name: (item.name as string) || 'Item',
      description: item.description as string | undefined,
      quantity: (item.quantity as number) || 1,
      unit_price: (item.price as number) || 0,
      tax_rate: 0.15,
      tax_amount: (item.tax as number) || 0,
      subtotal: (item.subtotal as number) || 0,
      total: (item.total as number) || 0,
      metadata: item.metadata as Record<string, unknown> | undefined,
    }));

    const result = await SalesPDFService.generatePDF({
      document: {
        id: salesOrder.id,
        org_id: orgId,
        customer_id: salesOrder.customer_id,
        document_number: salesOrder.document_number,
        reference_number: salesOrder.reference_number,
        status: salesOrder.status_enum || salesOrder.status,
        currency: salesOrder.currency,
        subtotal: salesOrder.subtotal,
        total_tax: salesOrder.total_tax,
        total: salesOrder.total,
        notes: salesOrder.notes,
        valid_until: salesOrder.valid_until,
        created_at: salesOrder.created_at,
        metadata: salesOrder.metadata,
      },
      items: mappedItems,
      customer: customer || {
        id: salesOrder.customer_id,
        name: salesOrder.customer_id,
      },
      documentKind: 'quotation', // Sales orders use quotation template style
      storeInDocuStore,
      userId,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${salesOrder.document_number}.pdf"`,
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
    console.error('Error in GET /api/v1/sales/sales-orders/[id]/pdf:', error);
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

    const salesOrder = await SalesOrderService.getSalesOrderById(id, orgId);
    if (!salesOrder) {
      return NextResponse.json(
        { success: false, error: 'Sales order not found' },
        { status: 404 }
      );
    }

    const items = await SalesOrderService.getSalesOrderItems(id);
    const customer = await SalesPDFService.getCustomerInfo(orgId, salesOrder.customer_id);

    const mappedItems = items.map((item: Record<string, unknown>, index: number) => ({
      line_number: index + 1,
      sku: item.sku as string | undefined,
      name: (item.name as string) || 'Item',
      description: item.description as string | undefined,
      quantity: (item.quantity as number) || 1,
      unit_price: (item.price as number) || 0,
      tax_rate: 0.15,
      tax_amount: (item.tax as number) || 0,
      subtotal: (item.subtotal as number) || 0,
      total: (item.total as number) || 0,
      metadata: item.metadata as Record<string, unknown> | undefined,
    }));

    const result = await SalesPDFService.generatePDF({
      document: {
        id: salesOrder.id,
        org_id: orgId,
        customer_id: salesOrder.customer_id,
        document_number: salesOrder.document_number,
        reference_number: salesOrder.reference_number,
        status: salesOrder.status_enum || salesOrder.status,
        currency: salesOrder.currency,
        subtotal: salesOrder.subtotal,
        total_tax: salesOrder.total_tax,
        total: salesOrder.total,
        notes: salesOrder.notes,
        valid_until: salesOrder.valid_until,
        created_at: salesOrder.created_at,
        metadata: salesOrder.metadata,
      },
      items: mappedItems,
      customer: customer || {
        id: salesOrder.customer_id,
        name: salesOrder.customer_id,
      },
      documentKind: 'quotation',
      storeInDocuStore: true,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        documentId: result.documentId,
        artifactId: result.artifactId,
        documentNumber: salesOrder.document_number,
      },
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/v1/sales/sales-orders/[id]/pdf:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

