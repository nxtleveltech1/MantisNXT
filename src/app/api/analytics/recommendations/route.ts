import { getOrSet, makeKey } from '@/lib/cache/responseCache';
/**
 * Recommendations API
 * EMERGENCY RECOVERY: Using stable pool connection
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  const cacheKey = makeKey(request.url);
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const category = searchParams.get('category') || 'all';

    console.log(
      `💡 Generating recommendations for organization: ${organizationId}, category: ${category}`
    );

    interface Recommendation {
      id: string;
      category: string;
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      impact: string;
      effort: string;
      action: string;
      created_at: string;
    }

    const recommendations: Recommendation[] = [];

    // Inventory optimization recommendations
    if (category === 'all' || category === 'inventory') {
      const inventoryQuery = `
        SELECT
          sp.name_from_supplier as product_name,
          0 as current_stock,
          0 as reorder_level,
          'maintain_current' as recommendation_type,
          0 as stock_difference
        FROM core.supplier_product sp
        WHERE sp.is_active = true
        LIMIT 10
      `;

      const inventoryResult = await pool.query(inventoryQuery);
      recommendations.push(
        ...inventoryResult.rows.map(row => {
          const priority: 'high' | 'medium' | 'low' =
            row.recommendation_type === 'urgent_reorder'
              ? 'high'
              : row.recommendation_type === 'schedule_reorder'
                ? 'medium'
                : 'low';
          return {
            id: `inv_${row.product_name?.replace(/\s+/g, '_')}`,
            category: 'inventory',
            priority,
            title: `Optimize ${row.product_name} Inventory`,
            description: getInventoryDescription(row),
            impact: 'medium',
            effort: 'low',
            action: getInventoryAction(row),
            created_at: new Date().toISOString(),
          };
        })
      );
    }

    // Supplier optimization recommendations
    if (category === 'all' || category === 'suppliers') {
      const supplierQuery = `
        SELECT
          name as supplier_name,
          COALESCE(
            CASE
              WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
              ELSE 30
            END, 30
          ) as payment_terms_days,
          COALESCE(default_currency, 'USD') as currency,
          CASE
            WHEN COALESCE(
              CASE
                WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
                ELSE 30
              END, 30
            ) > 60 THEN 'negotiate_terms'
            WHEN COALESCE(
              CASE
                WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
                ELSE 30
              END, 30
            ) > 45 THEN 'review_terms'
            ELSE 'maintain_relationship'
          END as recommendation_type
        FROM core.supplier
        WHERE active = true
        ORDER BY COALESCE(
          CASE
            WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
            ELSE 30
          END, 30
        ) DESC
        LIMIT 5
      `;

      const supplierResult = await pool.query(supplierQuery);
      recommendations.push(
        ...supplierResult.rows.map(row => {
          const priority: 'high' | 'medium' | 'low' =
            row.payment_terms_days > 60 ? 'high' : row.payment_terms_days > 45 ? 'medium' : 'low';
          return {
            id: `sup_${row.supplier_name?.replace(/\s+/g, '_')}`,
            category: 'suppliers',
            priority,
            title: `Optimize ${row.supplier_name} Terms`,
            description: `Payment terms are ${row.payment_terms_days} days. Consider negotiating better terms.`,
            impact: 'high',
            effort: 'medium',
            action: `Negotiate payment terms from ${row.payment_terms_days} days to 30 days`,
            created_at: new Date().toISOString(),
          };
        })
      );
    }

    // Financial optimization recommendations
    if (category === 'all' || category === 'financial') {
      const financialQuery = `
        SELECT
          COUNT(*) as total_suppliers,
          AVG(
            COALESCE(
              CASE
                WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
                ELSE 30
              END, 30
            )
          ) as avg_payment_terms,
          COUNT(
            CASE
              WHEN COALESCE(
                CASE
                  WHEN payment_terms ~ '^[0-9]+' THEN CAST(SUBSTRING(payment_terms FROM '^[0-9]+') AS INTEGER)
                  ELSE 30
                END, 30
              ) > 60 THEN 1
            END
          ) as high_risk_suppliers
        FROM core.supplier
        WHERE active = true
      `;

      const financialResult = await pool.query(financialQuery);
      if (financialResult.rows.length > 0) {
        const data = financialResult.rows[0];

        if (data.avg_payment_terms > 45) {
          recommendations.push({
            id: 'fin_payment_terms',
            category: 'financial',
            priority: 'high',
            title: 'Improve Overall Payment Terms',
            description: `Average payment terms are ${Math.round(data.avg_payment_terms)} days across ${data.total_suppliers} suppliers.`,
            impact: 'high',
            effort: 'high',
            action: 'Negotiate shorter payment terms with key suppliers to improve cash flow',
            created_at: new Date().toISOString(),
          });
        }

        if (data.high_risk_suppliers > 0) {
          recommendations.push({
            id: 'fin_risk_suppliers',
            category: 'financial',
            priority: 'medium',
            title: 'Review High-Risk Suppliers',
            description: `${data.high_risk_suppliers} suppliers have payment terms over 60 days.`,
            impact: 'medium',
            effort: 'medium',
            action: 'Review and potentially replace suppliers with excessive payment terms',
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // Sort recommendations by priority
    const priorityOrder: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    console.log(`✅ Generated ${recommendations.length} recommendations`);

    return NextResponse.json(
      await getOrSet(cacheKey, async () => ({
        success: true,
        data: {
          recommendations,
          total: recommendations.length,
          timestamp: new Date().toISOString(),
          organizationId,
          category,
        },
      }))
    );
  } catch (error) {
    console.error('❌ Recommendations API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getInventoryDescription(row: unknown): string {
  const { product_name, current_stock, reorder_level, recommendation_type } = row;

  switch (recommendation_type) {
    case 'urgent_reorder':
      return `${product_name} is critically low (${current_stock} units) below reorder level (${reorder_level}).`;
    case 'schedule_reorder':
      return `${product_name} needs reordering soon (${current_stock} units at reorder level ${reorder_level}).`;
    case 'reduce_order_quantity':
      return `${product_name} is overstocked (${current_stock} units vs ${reorder_level} reorder level).`;
    default:
      return `${product_name} inventory levels are optimal.`;
  }
}

function getInventoryAction(row: unknown): string {
  const { product_name, current_stock, reorder_level, recommendation_type } = row;

  switch (recommendation_type) {
    case 'urgent_reorder':
      return `Place urgent order for ${product_name}`;
    case 'schedule_reorder':
      return `Schedule reorder for ${product_name}`;
    case 'reduce_order_quantity':
      return `Reduce future order quantities for ${product_name}`;
    default:
      return `Monitor ${product_name} inventory levels`;
  }
}
