/**
 * Xero Invoices Sync API
 *
 * GET /api/xero/sync/invoices?type=ACCPAY|ACCREC
 * POST /api/xero/sync/invoices
 *
 * List (GET) or sync (POST) invoices to/from Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  syncSalesInvoiceToXero,
  syncSupplierInvoiceToXero,
  fetchInvoicesFromXero,
} from '@/lib/xero/sync/invoices';
import { validateXeroRequest, validateSyncParams, successResponse } from '@/lib/xero/validation';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;
    const type = request.nextUrl.searchParams.get('type') as 'ACCPAY' | 'ACCREC' | null;

    const result = await fetchInvoicesFromXero(orgId, {
      type: type ?? undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 400 }
      );
    }

    const invoices = (result.data ?? []).map((inv) => ({
      id: inv.InvoiceID,
      invoice_number: inv.InvoiceNumber ?? inv.InvoiceID,
      vendor_id: inv.Type === 'ACCPAY' ? inv.Contact?.ContactID : undefined,
      customer_id: inv.Type === 'ACCREC' ? inv.Contact?.ContactID : undefined,
      contact_name: inv.Contact?.Name,
      status: (inv.Status ?? '').toLowerCase(),
      total_amount: inv.Total ?? 0,
      due_date: inv.DueDate ?? inv.Date,
      currency: inv.CurrencyCode ?? 'ZAR',
      date: inv.Date,
    }));

    return NextResponse.json({
      success: true,
      data: invoices,
      count: invoices.length,
    });
  } catch (error) {
    return handleApiError(error, 'Xero Fetch Invoices');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate request
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;

    const { orgId } = validation;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const params = validateSyncParams(body);
    if (params instanceof NextResponse) return params;

    const { type, data } = params;

    switch (type) {
      case 'sales': {
        const result = await syncSalesInvoiceToXero(
          orgId,
          data as Parameters<typeof syncSalesInvoiceToXero>[1]
        );
        return successResponse(result);
      }

      case 'supplier': {
        const result = await syncSupplierInvoiceToXero(
          orgId,
          data as Parameters<typeof syncSupplierInvoiceToXero>[1]
        );
        return successResponse(result);
      }

      case 'fetch': {
        const options = data as {
          type?: 'ACCREC' | 'ACCPAY';
          status?: string;
          modifiedAfter?: string;
        };
        const result = await fetchInvoicesFromXero(orgId, {
          type: options?.type,
          status: options?.status,
          modifiedAfter: options?.modifiedAfter ? new Date(options.modifiedAfter) : undefined,
        });
        return successResponse(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid sync type. Expected: sales, supplier, or fetch' },
          { status: 400 }
        );
    }

  } catch (error) {
    return handleApiError(error, 'Xero Sync Invoices');
  }
}
