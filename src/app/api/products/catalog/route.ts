import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

interface ProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  supplier: {
    id: string;
    name: string;
  };
  pricelist: {
    id: string;
    name: string;
    validFrom: string;
    validTo: string | null;
  };
  category?: string;
  brand?: string;
  inStock: boolean;
  lastUpdated: string;
}

type ProductCatalogRow = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: string;
  currency?: string;
  pricelist_id: string;
  pricelist_name: string;
  validFrom: string;
  validTo: string | null;
  supplier_id: string;
  supplier_name: string;
  updatedAt: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search');
    const supplier = searchParams.get('supplier');
    const priceRange = searchParams.get('priceRange');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = (searchParams.get('sortOrder') || 'asc').toLowerCase();

    const whereClauses: string[] = ['p.active = true'];
    const filterParams: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(`
        (
          LOWER(pi.name) LIKE LOWER($${paramIndex}) OR
          LOWER(pi.description) LIKE LOWER($${paramIndex}) OR
          LOWER(pi.sku) LIKE LOWER($${paramIndex})
        )
      `);
      filterParams.push(`%${search}%`);
      paramIndex++;
    }

    if (supplier) {
      whereClauses.push(`s.id = $${paramIndex}`);
      filterParams.push(supplier);
      paramIndex++;
    }

    if (priceRange) {
      const [minRaw, maxRaw] = priceRange.split('-').map(value => parseFloat(value));
      if (!Number.isNaN(minRaw)) {
        whereClauses.push(`pi.price >= $${paramIndex}`);
        filterParams.push(minRaw);
        paramIndex++;
      }
      if (!Number.isNaN(maxRaw)) {
        whereClauses.push(`pi.price <= $${paramIndex}`);
        filterParams.push(maxRaw);
        paramIndex++;
      }
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join('\n      AND ')}` : '';

    const validSortColumns: Record<string, string> = {
      name: 'pi.name',
      price: 'pi.price',
      supplier: 's.name',
      updated: 'pi."updatedAt"',
    };
    const sortColumn = validSortColumns[sortBy] || 'pi.name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const listQuery = `
      SELECT 
        pi.id,
        pi.sku,
        pi.name,
        pi.description,
        pi.price,
        p.currency,
        p.id as pricelist_id,
        p.name as pricelist_name,
        p."validFrom",
        p."validTo",
        s.id as supplier_id,
        s.name as supplier_name,
        pi."updatedAt"
      FROM "PricelistItem" pi
      JOIN "Pricelist" p ON pi."pricelistId" = p.id
      JOIN public.suppliers s ON p."supplierId" = s.id
      ${whereSql}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const { rows } = await query<ProductCatalogRow>(listQuery, [...filterParams, limit, offset]);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM "PricelistItem" pi
      JOIN "Pricelist" p ON pi."pricelistId" = p.id
      JOIN public.suppliers s ON p."supplierId" = s.id
      ${whereSql}
    `;
    const { rows: countRows } = await query<{ total: string }>(countQuery, filterParams);
    const totalCount = parseInt(countRows[0]?.total || '0', 10);

    const priceStatsQuery = `
      SELECT 
        MIN(pi.price) as min_price,
        MAX(pi.price) as max_price,
        AVG(pi.price) as avg_price
      FROM "PricelistItem" pi
      JOIN "Pricelist" p ON pi."pricelistId" = p.id
      WHERE p.active = true
    `;
    const { rows: priceStatsRows } = await query<{
      min_price: string | null;
      max_price: string | null;
      avg_price: string | null;
    }>(priceStatsQuery);

    const products: ProductCatalogItem[] = rows.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      currency: row.currency || 'ZAR',
      supplier: {
        id: row.supplier_id,
        name: row.supplier_name,
      },
      pricelist: {
        id: row.pricelist_id,
        name: row.pricelist_name,
        validFrom: row.validFrom,
        validTo: row.validTo,
      },
      inStock: true,
      lastUpdated: row.updatedAt || new Date().toISOString(),
    }));

    return NextResponse.json({
      products,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      metadata: {
        priceRange: {
          min: priceStatsRows[0]?.min_price ? parseFloat(priceStatsRows[0].min_price) : null,
          max: priceStatsRows[0]?.max_price ? parseFloat(priceStatsRows[0].max_price) : null,
          average: priceStatsRows[0]?.avg_price
            ? parseFloat(priceStatsRows[0].avg_price).toFixed(2)
            : null,
        },
        filters: {
          suppliers: Boolean(supplier),
          priceRange: Boolean(priceRange),
        },
      },
    });
  } catch (error) {
    console.error('Product catalog error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch product catalog',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
