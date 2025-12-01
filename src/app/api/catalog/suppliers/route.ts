import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';

export async function GET() {
  try {
    const res = await dbQuery<{ supplier_id: string; name: string; code: string | null }>(
      'SELECT supplier_id, name, code FROM core.supplier ORDER BY name'
    );
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error) {
    console.error('[API] /api/catalog/suppliers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}
