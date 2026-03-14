/**
 * Xero Single Manual Journal Sync API
 *
 * POST /api/xero/sync/manual-journal/[id]
 * GET /api/xero/sync/manual-journal/[id] — sync status
 *
 * Sync a single NXT journal entry to Xero as a manual journal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { syncManualJournalToXero } from '@/lib/xero/sync/manual-journals';
import { handleApiError } from '@/lib/xero/errors';
import { query } from '@/lib/database';
import { GLService } from '@/lib/services/financial';

export async function POST(
  _request: NextRequest,
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

    const entry = await GLService.getJournalEntryById(id, orgId);
    if (!entry) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      );
    }

    const lines = await GLService.getJournalEntryLines(id);
    if (!lines.length) {
      return NextResponse.json(
        { success: false, error: 'Journal entry has no lines' },
        { status: 400 }
      );
    }

    // Resolve account codes (account table may have "code" or "account_code")
    const accountIds = [...new Set(lines.map((l) => l.account_id))];
    const accountRows = await query<{ id: string; code?: string; account_code?: string }>(
      `SELECT id, code, account_code FROM account WHERE id = ANY($1)`,
      [accountIds]
    );
    const codeByAccountId: Record<string, string> = {};
    for (const row of accountRows.rows) {
      const code = row.code ?? row.account_code ?? row.id;
      codeByAccountId[row.id] = String(code);
    }

    const journalLines = lines.map((line) => {
      const lineAmount = line.debit_amount > 0 ? line.debit_amount : -line.credit_amount;
      return {
        lineAmount,
        accountCode: codeByAccountId[line.account_id] ?? line.account_id,
        description: line.description ?? undefined,
      };
    });

    const nxtJournal = {
      id: entry.id,
      narration: entry.description,
      date: entry.entry_date,
      journalLines,
    };

    const result = await syncManualJournalToXero(orgId, nxtJournal);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, xeroEntityId: result.xeroEntityId });
  } catch (error) {
    return handleApiError(error, 'Xero Sync Manual Journal');
  }
}

export async function GET(
  _request: NextRequest,
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

    const result = await query<{
      xero_entity_id: string;
      sync_status: string;
      last_synced_at: Date | null;
    }>(
      `SELECT xero_entity_id, sync_status, last_synced_at
       FROM xero_entity_mappings
       WHERE org_id = $1 AND entity_type = 'manual_journal' AND nxt_entity_id = $2`,
      [orgId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ synced: false });
    }

    const mapping = result.rows[0];
    return NextResponse.json({
      synced: mapping.sync_status === 'synced',
      xeroEntityId: mapping.xero_entity_id,
      lastSyncedAt: mapping.last_synced_at?.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, 'Xero Manual Journal Status');
  }
}
