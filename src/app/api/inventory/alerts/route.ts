import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    // Get inventory alerts from database with optimized query
    const alertsQuery = `
      SELECT
        i.id,
        i.sku,
        i.name,
        i.stock_qty,
        i.reorder_point,
        i.cost_price,
        i.category,
        i.updated_at,
        s.name as supplier_name,
        s.id as supplier_id
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE
        (i.stock_qty = 0)
        OR (i.reorder_point IS NOT NULL AND i.reorder_point > 0 AND i.stock_qty <= i.reorder_point)
      ORDER BY
        CASE
          WHEN i.stock_qty = 0 THEN 1
          WHEN i.stock_qty <= i.reorder_point * 0.5 THEN 2
          WHEN i.stock_qty <= i.reorder_point THEN 3
          ELSE 4
        END,
        i.updated_at DESC
      LIMIT 100
    `

    const result = await query(alertsQuery, [], { timeout: 5000, maxRetries: 0 })

    // Transform database rows into alert objects
    const alerts = result.rows.map((item, index) => {
      const isOutOfStock = item.stock_qty === 0
      const isCritical = item.stock_qty <= item.reorder_point * 0.5
      const isLowStock = item.stock_qty <= item.reorder_point

      let type: 'low_stock' | 'out_of_stock' | 'excess_stock' | 'slow_moving' | 'expiring'
      let severity: 'critical' | 'high' | 'medium' | 'low'
      let message: string
      let recommendation: string
      let impact: string
      let estimatedCost: number

      if (isOutOfStock) {
        type = 'out_of_stock'
        severity = 'critical'
        message = `${item.name} is completely out of stock`
        recommendation = `Immediate reorder required. Contact ${item.supplier_name || 'supplier'} to expedite delivery.`
        impact = 'Cannot fulfill orders. Potential customer loss and revenue impact.'
        estimatedCost = parseFloat(item.cost_price || '0') * item.reorder_point * 1.5
      } else if (isCritical) {
        type = 'low_stock'
        severity = 'high'
        message = `${item.name} stock critically low (${item.stock_qty} units remaining)`
        recommendation = `Reorder immediately. Current stock below 50% of reorder point.`
        impact = 'High risk of stockout within 1-2 days. May impact order fulfillment.'
        estimatedCost = parseFloat(item.cost_price || '0') * item.reorder_point
      } else if (isLowStock) {
        type = 'low_stock'
        severity = 'medium'
        message = `${item.name} approaching reorder point (${item.stock_qty}/${item.reorder_point} units)`
        recommendation = `Plan reorder within 3-5 days to maintain optimal stock levels.`
        impact = 'Moderate risk. Monitor closely to avoid stockouts.'
        estimatedCost = parseFloat(item.cost_price || '0') * (item.reorder_point - item.stock_qty)
      } else {
        type = 'low_stock'
        severity = 'low'
        message = `${item.name} stock level normal`
        recommendation = 'No immediate action required.'
        impact = 'Minimal risk.'
        estimatedCost = 0
      }

      return {
        id: `alert_${item.id}_${index}`,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        type,
        severity,
        message,
        recommendation,
        impact,
        createdAt: item.updated_at,
        acknowledged: false,
        estimatedCost
      }
    })

    console.log(`Inventory Alerts Response: ${alerts.length} alerts generated`)

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        }
      }
    })
  } catch (error) {
    console.error('Error fetching inventory alerts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
