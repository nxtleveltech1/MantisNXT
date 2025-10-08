/**
 * Recommendations API
 * EMERGENCY RECOVERY: Using stable pool connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const category = searchParams.get('category') || 'all';

    console.log(`💡 Generating recommendations for organization: ${organizationId}, category: ${category}`);

    const recommendations = [];

    // Inventory optimization recommendations
    if (category === 'all' || category === 'inventory') {
      const inventoryQuery = `
        SELECT
          name as product_name,
          stock_qty as current_stock,
          COALESCE(reorder_point, 0) as reorder_level,
          CASE
            WHEN stock_qty <= COALESCE(reorder_point, 0) * 0.5 THEN 'urgent_reorder'
            WHEN stock_qty <= COALESCE(reorder_point, 0) THEN 'schedule_reorder'
            WHEN stock_qty > COALESCE(reorder_point, 0) * 3 AND COALESCE(reorder_point, 0) > 0 THEN 'reduce_order_quantity'
            ELSE 'maintain_current'
          END as recommendation_type,
          stock_qty - COALESCE(reorder_point, 0) as stock_difference
        FROM inventory_items
        WHERE stock_qty IS NOT NULL AND stock_qty >= 0
        ORDER BY (stock_qty / NULLIF(COALESCE(reorder_point, 0), 0)) ASC NULLS LAST
        LIMIT 10
      `;

      const inventoryResult = await pool.query(inventoryQuery);
      recommendations.push(...inventoryResult.rows.map(row => ({
        id: `inv_${row.product_name?.replace(/\s+/g, '_')}`,
        category: 'inventory',
        priority: row.recommendation_type === 'urgent_reorder' ? 'high' :
                 row.recommendation_type === 'schedule_reorder' ? 'medium' : 'low',
        title: `Optimize ${row.product_name} Inventory`,
        description: getInventoryDescription(row),
        impact: 'medium',
        effort: 'low',
        action: getInventoryAction(row),
        created_at: new Date().toISOString()
      })));
    }

    // Supplier optimization recommendations
    if (category === 'all' || category === 'suppliers') {
      const supplierQuery = `
        SELECT
          COALESCE(name, supplier_name, company_name) as supplier_name,
          COALESCE(payment_terms_days, 30) as payment_terms_days,
          COALESCE(currency, 'USD') as currency,
          CASE
            WHEN COALESCE(payment_terms_days, 30) > 60 THEN 'negotiate_terms'
            WHEN COALESCE(payment_terms_days, 30) > 45 THEN 'review_terms'
            ELSE 'maintain_relationship'
          END as recommendation_type
        FROM suppliers
        WHERE status = 'active'
        ORDER BY COALESCE(payment_terms_days, 30) DESC
        LIMIT 5
      `;

      const supplierResult = await pool.query(supplierQuery);
      recommendations.push(...supplierResult.rows.map(row => ({
        id: `sup_${row.supplier_name?.replace(/\s+/g, '_')}`,
        category: 'suppliers',
        priority: row.payment_terms_days > 60 ? 'high' :
                 row.payment_terms_days > 45 ? 'medium' : 'low',
        title: `Optimize ${row.supplier_name} Terms`,
        description: `Payment terms are ${row.payment_terms_days} days. Consider negotiating better terms.`,
        impact: 'high',
        effort: 'medium',
        action: `Negotiate payment terms from ${row.payment_terms_days} days to 30 days`,
        created_at: new Date().toISOString()
      })));
    }

    // Financial optimization recommendations
    if (category === 'all' || category === 'financial') {
      const financialQuery = `
        SELECT
          COUNT(*) as total_suppliers,
          AVG(COALESCE(payment_terms_days, 30)) as avg_payment_terms,
          COUNT(CASE WHEN COALESCE(payment_terms_days, 30) > 60 THEN 1 END) as high_risk_suppliers
        FROM suppliers
        WHERE status = 'active'
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
            created_at: new Date().toISOString()
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
            created_at: new Date().toISOString()
          });
        }
      }
    }

    // Sort recommendations by priority
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    recommendations.sort((a, b) =>
      (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
    );

    console.log(`✅ Generated ${recommendations.length} recommendations`);

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        total: recommendations.length,
        timestamp: new Date().toISOString(),
        organizationId,
        category
      }
    });

  } catch (error) {
    console.error('❌ Recommendations API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to generate recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getInventoryDescription(row: any): string {
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

function getInventoryAction(row: any): string {
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
