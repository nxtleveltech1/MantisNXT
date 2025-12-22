/**
 * Accounts Payable Invoice Detail API
 * GET /api/v1/financial/ap/invoices/[id] - Get invoice
 * PUT /api/v1/financial/ap/invoices/[id] - Update invoice
 * DELETE /api/v1/financial/ap/invoices/[id] - Delete invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { APService } from '@/lib/services/financial';
import { getOrgId } from '../../_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);

    const invoice = await APService.getVendorInvoiceById(id, orgId);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const lineItems = await APService.getInvoiceLineItems(id);

    return NextResponse.json({
      data: {
        ...invoice,
        line_items: lineItems,
      },
    });
  } catch (error) {
    console.error('Error fetching AP invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);

    // Update invoice logic would go here
    // For now, return not implemented
    return NextResponse.json(
      {
        success: false,
        error: 'Update not yet implemented',
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error updating AP invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update invoice',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId(request);

    // Delete logic would go here
    // For now, return not implemented
    return NextResponse.json(
      {
        success: false,
        error: 'Delete not yet implemented',
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error deleting AP invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete invoice',
      },
      { status: 500 }
    );
  }
}

