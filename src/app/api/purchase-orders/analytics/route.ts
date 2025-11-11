import { NextResponse } from 'next/server'
import { pool } from '@/lib/database'

export async function GET() {
  try {
    // Get comprehensive analytics from purchase_orders table
    const analyticsQuery = `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_value,
        COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_approvals,
        COUNT(*) FILTER (WHERE status IN ('approved', 'sent', 'acknowledged', 'in_progress', 'shipped')) as in_progress,
        COUNT(*) FILTER (WHERE requested_delivery_date < NOW() AND status NOT IN ('received', 'completed', 'cancelled')) as overdue_deliveries,
        AVG(total_amount) as avg_order_value,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_orders
      FROM purchase_orders
    `

    // Get top categories by value
    const topCategoriesQuery = `
      SELECT
        category,
        SUM(total_amount) as value,
        COUNT(*) as count,
        AVG(total_amount) as avg_value
      FROM purchase_orders
      WHERE category IS NOT NULL AND status != 'cancelled'
      GROUP BY category
      ORDER BY value DESC
      LIMIT 5
    `

    // Get recent purchase orders
    const recentOrdersQuery = `
      SELECT
        po.po_number,
        po.title,
        po.total_amount,
        po.status,
        po.created_at,
        s.name as supplier_name,
        po.requested_by
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.status != 'cancelled'
      ORDER BY po.created_at DESC
      LIMIT 10
    `

    // Get department breakdown
    const departmentBreakdownQuery = `
      SELECT
        department,
        SUM(total_amount) as value,
        COUNT(*) as count,
        AVG(total_amount) as avg_value
      FROM purchase_orders
      WHERE status != 'cancelled'
      GROUP BY department
      ORDER BY value DESC
      LIMIT 10
    `

    // Execute all queries in parallel
    const [
      analyticsResult,
      topCategoriesResult,
      recentOrdersResult,
      departmentBreakdownResult
    ] = await Promise.all([
      pool.query(analyticsQuery),
      pool.query(topCategoriesQuery),
      pool.query(recentOrdersQuery),
      pool.query(departmentBreakdownQuery)
    ])

    const analyticsRow = analyticsResult.rows[0]

    // Calculate additional metrics
    const avgCycleTime = 72 // Mock calculation - could be derived from approval timestamps
    const onTimeDeliveryRate = 89.2 // Mock calculation
    const budgetUtilization = 68.5 // Mock calculation
    const qualityScore = 94.5 // Mock calculation
    const costSavings = 125000 // Mock calculation
    const contractCompliance = 96.8 // Mock calculation
    const supplierPerformance = 91.3 // Mock calculation

    const analytics = {
      totalOrders: parseInt(analyticsRow.total_orders),
      totalValue: parseFloat(analyticsRow.total_value || '0'),
      pendingApprovals: parseInt(analyticsRow.pending_approvals),
      inProgress: parseInt(analyticsRow.in_progress),
      overdueDeliveries: parseInt(analyticsRow.overdue_deliveries),
      avgOrderValue: parseFloat(analyticsRow.avg_order_value || '0'),
      draftOrders: parseInt(analyticsRow.draft_orders),
      completedOrders: parseInt(analyticsRow.completed_orders),
      avgCycleTime,
      onTimeDeliveryRate,
      budgetUtilization,
      qualityScore,
      costSavings,
      contractCompliance,
      supplierPerformance,
      topCategories: topCategoriesResult.rows.map(row => ({
        name: (row.category || 'Unknown').replace(/[_-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        value: parseFloat(row.value || '0'),
        count: parseInt(row.count),
        avgValue: parseFloat(row.avg_value || '0')
      })),
      recentOrders: recentOrdersResult.rows.map(row => ({
        poNumber: row.po_number,
        title: row.title,
        amount: parseFloat(row.total_amount || '0'),
        status: row.status,
        createdAt: row.created_at,
        supplier: row.supplier_name,
        requestedBy: row.requested_by
      })),
      departmentBreakdown: departmentBreakdownResult.rows.map(row => ({
        department: row.department,
        value: parseFloat(row.value || '0'),
        count: parseInt(row.count),
        avgValue: parseFloat(row.avg_value || '0')
      }))
    }

    console.log('Purchase Orders Analytics Response:', analytics)

    return NextResponse.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Error fetching purchase orders analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch purchase orders analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}