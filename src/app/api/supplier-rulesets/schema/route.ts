import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tableSchema = url.searchParams.get('schema') || 'spp';
    const tableName = 'supplier_rules';

    const sql = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;
    const res = await query(sql, [tableSchema, tableName]);

    return NextResponse.json({
      success: true,
      schema: tableSchema,
      table: tableName,
      columns: res.rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read table columns',
      },
      { status: 500 }
    );
  }
}
