/**
 * POST /api/v1/financial/odoo-ingest
 * Ingest Odoo extraction JSON into platform (odoo_accounts, taxes, payment terms, journals, fiscal positions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '../_helpers';
import { runOdooIngest } from '@/lib/financial/odoo-ingest';
import type { OdooExtractionPayload } from '@/lib/financial/odoo-ingest';

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const payload = (body.payload ?? body) as OdooExtractionPayload;
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'Body must be JSON with payload or root object containing accounts, journals, etc.' },
        { status: 400 }
      );
    }

    const sourceFile = typeof body.sourceFile === 'string' ? body.sourceFile : undefined;
    const cutoverDate =
      typeof body.cutoverDate === 'string' && body.cutoverDate
        ? body.cutoverDate
        : undefined;

    const result = await runOdooIngest({
      orgId,
      payload,
      sourceFile,
      cutoverDate: cutoverDate ?? null,
    });

    const status = result.status === 'failed' ? 422 : 200;
    return NextResponse.json(
      {
        success: result.status !== 'failed',
        importId: result.importId,
        status: result.status,
        recordsImported: result.recordsImported,
        validationErrors: result.validationErrors,
      },
      { status }
    );
  } catch (error) {
    console.error('Odoo ingest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ingest failed' },
      { status: 500 }
    );
  }
}
