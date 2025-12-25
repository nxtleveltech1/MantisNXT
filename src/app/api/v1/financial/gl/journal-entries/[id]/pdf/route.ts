// UPDATE: [2025-12-25] Created journal entry PDF route with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOrgId } from '../../../../_helpers';
import { FinancialPDFService } from '@/lib/services/financial/financial-pdf-service';
import { query } from '@/lib/database/unified-connection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface JournalEntryRow {
  id: string;
  org_id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  status: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
}

interface JournalEntryLineRow {
  account_id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const orgId = await getOrgId(request);
    const userId = request.headers.get('x-user-id') || undefined;

    // Fetch journal entry
    const entryResult = await query<JournalEntryRow>(
      `SELECT * FROM financial.journal_entries WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );

    if (entryResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Journal entry not found' },
        { status: 404 }
      );
    }

    const entry = entryResult.rows[0];

    // Fetch journal lines
    const linesResult = await query<JournalEntryLineRow>(
      `SELECT 
        jl.account_id,
        a.account_code,
        a.account_name,
        jl.debit_amount,
        jl.credit_amount,
        jl.description
      FROM financial.journal_entry_lines jl
      JOIN financial.accounts a ON a.id = jl.account_id
      WHERE jl.journal_entry_id = $1
      ORDER BY jl.line_number`,
      [id]
    );

    const htmlContent = FinancialPDFService.generateJournalEntryHTML({
      entryNumber: entry.entry_number,
      date: entry.entry_date,
      description: entry.description,
      lines: linesResult.rows.map(line => ({
        accountCode: line.account_code,
        accountName: line.account_name,
        debit: line.debit_amount || 0,
        credit: line.credit_amount || 0,
      })),
      totalDebit: entry.total_debit,
      totalCredit: entry.total_credit,
    });

    const result = await FinancialPDFService.generate({
      orgId,
      documentType: 'journal_entry',
      documentNumber: entry.entry_number,
      title: `Journal Entry ${entry.entry_number}`,
      description: entry.description,
      htmlContent,
      metadata: {
        entry_id: id,
        entry_number: entry.entry_number,
        entry_date: entry.entry_date,
        status: entry.status,
        total_debit: entry.total_debit,
        total_credit: entry.total_credit,
      },
      entityLinks: [
        { entityType: 'journal_entry', entityId: id, linkType: 'primary' },
      ],
      userId,
    });

    return new NextResponse(result.pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${entry.entry_number}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
        'X-DocuStore-Document-Id': result.documentId,
        'X-DocuStore-Artifact-Id': result.artifactId,
      },
    });
  } catch (error) {
    console.error('Error generating journal entry PDF:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

