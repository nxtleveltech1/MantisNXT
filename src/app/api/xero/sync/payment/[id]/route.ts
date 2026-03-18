/**
 * Xero Single Payment Sync API
 *
 * POST /api/xero/sync/payment/[id]
 * GET /api/xero/sync/payment/[id] - sync status
 *
 * Sync a single payment (AP payment or AR receipt) by NXT ID to Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncPaymentToXero } from '@/lib/xero/sync/payments';
import { handleApiError } from '@/lib/xero/errors';
import { query } from '@/lib/database';
import { validateXeroRequest } from '@/lib/xero/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;
    const { orgId } = validation;

    // Try AP payment first
    const apPayment = await query<{
      id: string;
      amount: number;
      payment_date: string;
      reference_number: string | null;
    }>(
      `SELECT id, amount, payment_date, reference_number FROM ap_payments WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );

    if (apPayment.rows.length > 0) {
      const alloc = await query<{ ap_invoice_id: string }>(
        `SELECT ap_invoice_id FROM ap_payment_allocations WHERE ap_payment_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [id]
      );
      const invoiceId = alloc.rows[0]?.ap_invoice_id;
      if (!invoiceId) {
        return NextResponse.json(
          { success: false, error: 'Payment has no allocation to an invoice. Allocate payment first.' },
          { status: 400 }
        );
      }
      const row = apPayment.rows[0];
      const result = await syncPaymentToXero(orgId, {
        id: row.id,
        invoiceId,
        amount: Number(row.amount),
        date: row.payment_date,
        reference: row.reference_number ?? undefined,
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, xeroEntityId: result.xeroEntityId });
    }

    // Try AR receipt
    const arReceipt = await query<{
      id: string;
      amount: number;
      receipt_date: string;
      reference_number: string | null;
    }>(
      `SELECT id, amount, receipt_date, reference_number FROM ar_receipts WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );

    if (arReceipt.rows.length > 0) {
      const alloc = await query<{ ar_invoice_id: string }>(
        `SELECT ar_invoice_id FROM ar_receipt_allocations WHERE ar_receipt_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [id]
      );
      const invoiceId = alloc.rows[0]?.ar_invoice_id;
      if (!invoiceId) {
        return NextResponse.json(
          { success: false, error: 'Receipt has no allocation to an invoice. Allocate receipt first.' },
          { status: 400 }
        );
      }
      const row = arReceipt.rows[0];
      const result = await syncPaymentToXero(orgId, {
        id: row.id,
        invoiceId,
        amount: Number(row.amount),
        date: row.receipt_date,
        reference: row.reference_number ?? undefined,
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, xeroEntityId: result.xeroEntityId });
    }

    return NextResponse.json(
      { error: 'Payment or receipt not found' },
      { status: 404 }
    );
  } catch (error) {
    return handleApiError(error, 'Xero Sync Payment');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validation = await validateXeroRequest(request, false);
    if (validation.error) return validation.error;
    const { orgId } = validation;

    const result = await query<{
      xero_entity_id: string;
      sync_status: string;
      last_synced_at: Date | null;
    }>(
      `SELECT xero_entity_id, sync_status, last_synced_at
       FROM xero_entity_mappings
       WHERE org_id = $1 AND entity_type = 'payment' AND nxt_entity_id = $2`,
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
    return handleApiError(error, 'Xero Payment Status');
  }
}
