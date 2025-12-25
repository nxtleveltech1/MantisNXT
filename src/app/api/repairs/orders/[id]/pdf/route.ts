// UPDATE: [2025-12-25] Created repair order PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import * as repairOrderService from '@/services/repairs/repairOrderService';
import { generateRepairOrderPDF, generateRepairInvoicePDF, getCustomerForRepair } from '@/services/repairs/repairPDFService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const type = request.nextUrl.searchParams.get('type') || 'order'; // 'order' or 'invoice'
    
    const order = await repairOrderService.getRepairOrderById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Repair order not found' },
        { status: 404 }
      );
    }

    const items = await repairOrderService.getRepairOrderItems(id);
    const customer = await getCustomerForRepair(order.customer_id);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Customer not found' },
        { status: 404 }
      );
    }

    const result = type === 'invoice'
      ? await generateRepairInvoicePDF(order, items, customer, user.userId)
      : await generateRepairOrderPDF(order, items, customer, user.userId);

    const filename = type === 'invoice'
      ? `INV-${order.order_number}.pdf`
      : `${order.order_number}.pdf`;

    return new NextResponse(result.pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
        'X-DocuStore-Document-Id': result.documentId,
        'X-DocuStore-Artifact-Id': result.artifactId,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/repairs/orders/[id]/pdf:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const type = body.type || 'order';
    
    const order = await repairOrderService.getRepairOrderById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Repair order not found' },
        { status: 404 }
      );
    }

    const items = await repairOrderService.getRepairOrderItems(id);
    const customer = await getCustomerForRepair(order.customer_id);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Customer not found' },
        { status: 404 }
      );
    }

    const result = type === 'invoice'
      ? await generateRepairInvoicePDF(order, items, customer, user.userId)
      : await generateRepairOrderPDF(order, items, customer, user.userId);

    return NextResponse.json({
      success: true,
      data: {
        documentId: result.documentId,
        artifactId: result.artifactId,
        orderNumber: order.order_number,
        type,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/repairs/orders/[id]/pdf:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      },
      { status: 500 }
    );
  }
}

