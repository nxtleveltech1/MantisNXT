import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';

export async function GET() {
  try {
    // CRITICAL: Only return ACTIVE suppliers that have inventory (products) loaded
    // Suppliers without any products in the catalog should not appear in the dropdown
    const res = await dbQuery<{ supplier_id: string; name: string; code: string | null }>(
      `SELECT DISTINCT s.supplier_id, s.name, s.code 
       FROM core.supplier s
       INNER JOIN core.supplier_product sp ON s.supplier_id = sp.supplier_id
       WHERE s.active = true
       ORDER BY s.name`
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
