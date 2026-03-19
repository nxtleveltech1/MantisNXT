/**
 * GET /api/v1/financial/odoo-ingest/imports
 * List Odoo config imports for the org
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getOrgId } from '../../_helpers';

interface ImportRow {
  id: string;
  org_id: string;
  source_file: string | null;
  import_date: string;
  cutover_date: string | null;
  records_imported: Record<string, number>;
  validation_errors: unknown;
  status: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10), 100);

    const { rows } = await query<ImportRow>(
      `SELECT id, org_id, source_file, import_date, cutover_date,
              records_imported, validation_errors, status, created_at
       FROM odoo_config_imports
       WHERE org_id = $1
       ORDER BY import_date DESC
       LIMIT $2`,
      [orgId, limit]
    );

    return NextResponse.json({
      success: true,
      data: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error('Odoo imports list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch imports' },
      { status: 500 }
    );
  }
}
