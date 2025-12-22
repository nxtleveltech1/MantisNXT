import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/database/unified-connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');

    // Get unique brands from pricelist_row and attrs_json
    // Combining brands from both sources for complete coverage
    let sql = `
      WITH pricelist_brands AS (
        SELECT DISTINCT r.brand
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
        WHERE r.brand IS NOT NULL AND r.brand <> ''
        ${supplierId ? 'AND u.supplier_id = $1' : ''}
      ),
      attrs_brands AS (
        SELECT DISTINCT sp.attrs_json->>'brand' AS brand
        FROM core.supplier_product sp
        WHERE sp.attrs_json->>'brand' IS NOT NULL 
          AND sp.attrs_json->>'brand' <> ''
        ${supplierId ? 'AND sp.supplier_id = $1' : ''}
      ),
      all_brands AS (
        SELECT brand FROM pricelist_brands
        UNION
        SELECT brand FROM attrs_brands
      )
      SELECT brand
      FROM all_brands
      WHERE brand IS NOT NULL AND brand <> ''
      ORDER BY brand
    `;

    const params = supplierId ? [supplierId] : [];
    const res = await dbQuery<{ brand: string }>(sql, params);

    return NextResponse.json({
      success: true,
      data: res.rows.map(r => ({ brand: r.brand, name: r.brand })),
    });
  } catch (error) {
    console.error('[API] /api/catalog/brands error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

