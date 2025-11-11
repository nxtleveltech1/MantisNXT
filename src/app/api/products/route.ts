import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getUncategorizedProducts, getProductsBySupplier } from '@/lib/cmm/sip-product-enrichment';

/**
 * GET /api/products
 * Get products for categorization (supports SIP products)
 *
 * Query params:
 * - uncategorized: only return uncategorized products (default: false)
 * - supplier_id: filter by supplier
 * - limit: max results (default: 50)
 * - offset: pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uncategorized = searchParams.get('uncategorized') === 'true';
    const supplierId = searchParams.get('supplier_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (supplierId) {
      // Get products by supplier
      const result = await getProductsBySupplier(supplierId, {
        uncategorized_only: uncategorized,
        limit,
        offset,
      });

      return NextResponse.json({
        success: true,
        products: result.products,
        total: result.total,
        pagination: {
          limit,
          offset,
          total: result.total,
        },
      });
    } else if (uncategorized) {
      // Get uncategorized products
      const result = await getUncategorizedProducts({
        supplier_id: undefined,
        limit,
        offset,
      });

      return NextResponse.json({
        success: true,
        products: result.products,
        total: result.total,
        pagination: {
          limit,
          offset,
          total: result.total,
        },
      });
    } else {
      // For now, return uncategorized products as default
      // Can be enhanced to return all products with pagination
      const result = await getUncategorizedProducts({
        supplier_id: undefined,
        limit,
        offset,
      });

      return NextResponse.json({
        success: true,
        products: result.products,
        total: result.total,
        pagination: {
          limit,
          offset,
          total: result.total,
        },
      });
    }
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch products',
        products: [],
      },
      { status: 500 }
    );
  }
}
