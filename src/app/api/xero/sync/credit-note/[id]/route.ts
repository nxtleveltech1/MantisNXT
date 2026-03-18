/**
 * Xero Single Credit Note Sync API
 *
 * POST /api/xero/sync/credit-note/[id]
 * GET /api/xero/sync/credit-note/[id] - sync status
 *
 * Sync a single credit note (AP or AR) by NXT ID to Xero.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncCreditNoteToXero } from '@/lib/xero/sync/credit-notes';
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

    // Try AP credit note first
    const apCn = await query<{
      id: string;
      vendor_id: string;
      credit_note_number: string;
      credit_note_date: string;
      reason: string | null;
      notes: string | null;
      total_amount: number;
    }>(
      `SELECT id, vendor_id, credit_note_number, credit_note_date, reason, notes, total_amount
       FROM ap_credit_notes WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );

    if (apCn.rows.length > 0) {
      const row = apCn.rows[0];
      const nxtCreditNote = {
        id: row.id,
        contactId: row.vendor_id,
        creditNoteNumber: row.credit_note_number,
        date: row.credit_note_date,
        reference: row.reason ?? row.notes ?? undefined,
        type: 'purchase' as const,
        lineItems: [
          {
            description: row.reason ?? row.notes ?? 'Credit note',
            quantity: 1,
            unitPrice: Number(row.total_amount),
          },
        ],
      };
      const result = await syncCreditNoteToXero(orgId, nxtCreditNote);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, xeroEntityId: result.xeroEntityId });
    }

    // Try AR credit note
    const arCn = await query<{
      id: string;
      customer_id: string;
      credit_note_number: string;
      credit_note_date: string;
      reason: string | null;
      notes: string | null;
      total_amount: number;
    }>(
      `SELECT id, customer_id, credit_note_number, credit_note_date, reason, notes, total_amount
       FROM ar_credit_notes WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );

    if (arCn.rows.length > 0) {
      const row = arCn.rows[0];
      const nxtCreditNote = {
        id: row.id,
        contactId: row.customer_id,
        creditNoteNumber: row.credit_note_number,
        date: row.credit_note_date,
        reference: row.reason ?? row.notes ?? undefined,
        type: 'sales' as const,
        lineItems: [
          {
            description: row.reason ?? row.notes ?? 'Credit note',
            quantity: 1,
            unitPrice: Number(row.total_amount),
          },
        ],
      };
      const result = await syncCreditNoteToXero(orgId, nxtCreditNote);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, xeroEntityId: result.xeroEntityId });
    }

    return NextResponse.json(
      { error: 'Credit note not found' },
      { status: 404 }
    );
  } catch (error) {
    return handleApiError(error, 'Xero Sync Credit Note');
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
       WHERE org_id = $1 AND entity_type = 'credit_note' AND nxt_entity_id = $2`,
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
    return handleApiError(error, 'Xero Credit Note Status');
  }
}
