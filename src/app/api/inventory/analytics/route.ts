import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get total inventory value
    const totalValueQuery = `
      SELECT COALESCE(SUM(total_value_zar), 0) as total_value
      FROM inventory_items
    `

    // Get total items count
    const totalItemsQuery = `
      SELECT COUNT(*) as total_items
      FROM inventory_items
    `

    // Get low stock items count
    const lowStockQuery = `
      SELECT COUNT(*) as low_stock_count
      FROM inventory_items
      WHERE current_stock <= reorder_point AND current_stock > 0
    `

    // Get out of stock items count
    const outOfStockQuery = `
      SELECT COUNT(*) as out_of_stock_count
      FROM inventory_items
      WHERE current_stock = 0
    `

    // Get top categories by value
    const topCategoriesQuery = `
      SELECT
        p.category,
        SUM(i.total_value_zar) as value,
        COUNT(*) as count
      FROM inventory_items i
      JOIN products p ON i.product_id = p.id
      GROUP BY p.category
      ORDER BY value DESC
      LIMIT 5
    `

    // Get recent stock movements
    const recentMovementsQuery = `
      SELECT
        sm.*,
        p.name as product_name,
        p.sku
      FROM stock_movements sm
      JOIN inventory_items i ON sm.inventory_item_id = i.id
      JOIN products p ON i.product_id = p.id
      ORDER BY sm.created_at DESC
      LIMIT 10
    `

    // Execute all queries in parallel
    const [
      totalValueResult,
      totalItemsResult,
      lowStockResult,
      outOfStockResult,
      topCategoriesResult,
      recentMovementsResult
    ] = await Promise.all([
      db.query(totalValueQuery),
      db.query(totalItemsQuery),
      db.query(lowStockQuery),
      db.query(outOfStockQuery),
      db.query(topCategoriesQuery),
      db.query(recentMovementsQuery)
    ])

    // Calculate average turnover (mock calculation)
    const avgTurnover = 4.2

    const analytics = {
      totalValue: parseFloat(totalValueResult.rows[0].total_value),
      totalItems: parseInt(totalItemsResult.rows[0].total_items),
      lowStockCount: parseInt(lowStockResult.rows[0].low_stock_count),
      outOfStockCount: parseInt(outOfStockResult.rows[0].out_of_stock_count),
      avgTurnover,
      topCategories: topCategoriesResult.rows.map(row => ({
        name: row.category.replace('_', ' ').toUpperCase(),
        value: parseFloat(row.value),
        count: parseInt(row.count)
      })),
      recentMovements: recentMovementsResult.rows.map(row => ({
        date: row.created_at,
        type: row.movement_type,
        quantity: row.quantity,
        product: row.product_name,
        sku: row.sku
      }))
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Error fetching inventory analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}