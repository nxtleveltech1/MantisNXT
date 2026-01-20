/**
 * Xero Single Invoice Sync API
 * 
 * POST /api/xero/sync/invoices/[id]
 * GET /api/xero/sync/invoices/[id]/status
 * 
 * Sync a single invoice by NXT ID to Xero
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ARService } from '@/lib/services/financial';
import { APService } from '@/lib/services/financial';
import { syncSalesInvoiceToXero, syncSupplierInvoiceToXero } from '@/lib/xero/sync/invoices';
import { validateXeroRequest, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 }
      );
    }

    // Determine invoice type by checking both AR and AP tables
    const arInvoice = await ARService.getARInvoiceById(id, orgId);
    const apInvoice = arInvoice ? null : await APService.getVendorInvoiceById(id, orgId);

    if (!arInvoice && !apInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (arInvoice) {
      // Get line items
      const lineItemsResult = await query<{
        description: string;
        quantity: number;
        unit_price: number;
        tax_rate: number;
        tax_amount: number;
        line_total: number;
        account_id: string | null;
      }>(
        'SELECT description, quantity, unit_price, tax_rate, tax_amount, line_total, account_id FROM ar_invoice_line_items WHERE ar_invoice_id = $1 ORDER BY line_number',
        [id]
      );

      const nxtInvoice = {
        id: arInvoice.id,
        customerId: arInvoice.customer_id,
        customerName: undefined,
        invoiceNumber: arInvoice.invoice_number,
        invoiceDate: arInvoice.invoice_date,
        dueDate: arInvoice.due_date,
        currency: arInvoice.currency,
        reference: arInvoice.notes || undefined,
        subtotal: arInvoice.subtotal,
        taxAmount: arInvoice.tax_amount,
        totalAmount: arInvoice.total_amount,
        status: arInvoice.status,
        lineItems: lineItemsResult.rows.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate,
          taxAmount: item.tax_amount,
          lineTotal: item.line_total,
          accountCode: item.account_id || undefined,
        })),
      };

      const result = await syncSalesInvoiceToXero(orgId, nxtInvoice);
      return successResponse(result);
    }

    if (apInvoice) {
      // Get line items
      const lineItemsResult = await query<{
        description: string;
        quantity: number;
        unit_price: number;
        tax_rate: number;
        account_id: string | null;
      }>(
        'SELECT description, quantity, unit_price, tax_rate, account_id FROM ap_invoice_line_items WHERE ap_invoice_id = $1 ORDER BY line_number',
        [id]
      );

      const nxtInvoice = {
        id: apInvoice.id,
        supplierId: apInvoice.vendor_id,
        invoiceNumber: apInvoice.vendor_invoice_number,
        invoiceDate: apInvoice.invoice_date,
        dueDate: apInvoice.due_date,
        currency: apInvoice.currency,
        reference: apInvoice.notes || undefined,
        lineItems: lineItemsResult.rows.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate,
          accountCode: item.account_id || undefined,
        })),
      };

      const result = await syncSupplierInvoiceToXero(orgId, nxtInvoice);
      return successResponse(result);
    }

    return NextResponse.json(
      { error: 'Invoice not found' },
      { status: 404 }
    );

  } catch (error) {
    return handleApiError(error, 'Xero Sync Invoice');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 }
      );
    }

    // Check sync status
    const result = await query<{
      xero_entity_id: string;
      sync_status: string;
      last_synced_at: Date | null;
    }>(
      `SELECT xero_entity_id, sync_status, last_synced_at 
       FROM xero_entity_mappings 
       WHERE org_id = $1 AND entity_type = 'invoice' AND nxt_entity_id = $2`,
      [orgId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        synced: false,
      });
    }

    const mapping = result.rows[0];
    return NextResponse.json({
      synced: mapping.sync_status === 'synced',
      xeroEntityId: mapping.xero_entity_id,
      lastSyncedAt: mapping.last_synced_at?.toISOString(),
    });

  } catch (error) {
    return handleApiError(error, 'Xero Invoice Status');
  }
}
