import { NextResponse } from 'next/server';
import { query } from '@/lib/database/unified-connection';

export async function GET() {
  try {
    // Test the Product to inventory_items relationship
    const productInventoryQuery = `
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        p."supplierId" as supplier_id,
        p.active as product_active,
        i.id as inventory_id,
        i.name as inventory_name,
        i.sku as inventory_sku,
        i.stock_qty,
        i.cost_price,
        s.name as supplier_name
      FROM "Product" p
      LEFT JOIN public.inventory_items i ON p.sku = i.sku
      LEFT JOIN public.suppliers s ON p."supplierId"::text = s.id
      ORDER BY p."createdAt" DESC
      LIMIT 10
    `;

    const result = await query(productInventoryQuery);

    // Get counts
    const countsQuery = `
      SELECT
        (SELECT COUNT(*) FROM "Product" WHERE active = true) as total_products,
        (SELECT COUNT(*) FROM public.inventory_items) as total_inventory,
        (SELECT COUNT(*)
         FROM "Product" p
         INNER JOIN public.inventory_items i ON p.sku = i.sku
         WHERE p.active = true) as linked_items
    `;

    const countsResult = await query(countsQuery);
    const counts = countsResult.rows[0];

    // Check for orphaned records
    const orphanedProductsQuery = `
      SELECT COUNT(*) as count
      FROM "Product" p
      LEFT JOIN public.inventory_items i ON p.sku = i.sku
      WHERE i.sku IS NULL AND p.active = true
    `;

    const orphanedInventoryQuery = `
      SELECT COUNT(*) as count
      FROM public.inventory_items i
      LEFT JOIN "Product" p ON i.sku = p.sku
      WHERE p.sku IS NULL
    `;

    const [orphanedProductsResult, orphanedInventoryResult] = await Promise.all([
      query(orphanedProductsQuery),
      query(orphanedInventoryQuery),
    ]);

    const analysis = {
      totalProducts: parseInt(counts.total_products) || 0,
      totalInventory: parseInt(counts.total_inventory) || 0,
      linkedItems: parseInt(counts.linked_items) || 0,
      orphanedProducts: orphanedProductsResult.rows[0].count || 0,
      orphanedInventory: orphanedInventoryResult.rows[0].count || 0,
      linkageRate:
        counts.total_products > 0
          ? ((counts.linked_items / counts.total_products) * 100).toFixed(1) + '%'
          : '0%',
      coverageRate:
        counts.total_inventory > 0
          ? ((counts.linked_items / counts.total_inventory) * 100).toFixed(1) + '%'
          : '0%',
    };

    return NextResponse.json({
      success: true,
      data: {
        relationships: result.rows,
        analysis,
        recommendations: generateRecommendations(analysis),
      },
    });
  } catch (error) {
    console.error('Error verifying product-inventory relationship:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify relationships',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(analysis: unknown): string[] {
  const recommendations = [];

  if (analysis.orphanedProducts > 0) {
    recommendations.push(
      `${analysis.orphanedProducts} products have no inventory records - consider creating inventory entries`
    );
  }

  if (analysis.orphanedInventory > 0) {
    recommendations.push(
      `${analysis.orphanedInventory} inventory items have no product records - verify data integrity`
    );
  }

  if (parseFloat(analysis.linkageRate) < 80) {
    recommendations.push(
      'Low linkage rate - consider improving data synchronization between Product and inventory_items'
    );
  }

  if (analysis.totalProducts === 0) {
    recommendations.push(
      'No products found - use the pricelist promotion workflow to populate the Product table'
    );
  }

  if (
    analysis.linkedItems === analysis.totalProducts &&
    analysis.linkedItems === analysis.totalInventory
  ) {
    recommendations.push('Perfect synchronization between Product and inventory_items tables');
  }

  return recommendations;
}
