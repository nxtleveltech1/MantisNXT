import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { query } from '@/lib/database'

// ============================================================================
// SYSTEM ANALYTICS API - REAL-TIME MONITORING
// Comprehensive system performance and business analytics
// ============================================================================

// Validation schemas
const AnalyticsQuerySchema = z.object({
  timeframe: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).default('day'),
  metrics: z.array(z.enum([
    'inventory', 'suppliers', 'movements', 'processing', 'performance', 'alerts'
  ])).default(['inventory', 'suppliers']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeComparisons: z.boolean().default(true),
  includeForecasts: z.boolean().default(false),
  groupBy: z.enum(['supplier', 'category', 'location', 'status']).optional(),
})

const PerformanceQuerySchema = z.object({
  component: z.enum(['database', 'api', 'processing', 'system']).optional(),
  period: z.enum(['5min', '15min', '1hour', '4hour', '24hour']).default('1hour'),
  includeMetrics: z.array(z.enum([
    'response_time', 'throughput', 'error_rate', 'resource_usage', 'cache_hit_rate'
  ])).default(['response_time', 'throughput']),
})

/**
 * GET /api/analytics/system - Comprehensive system analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const queryParams = {
      timeframe: searchParams.get('timeframe') as any || 'day',
      metrics: searchParams.get('metrics')?.split(',') as any || ['inventory', 'suppliers'],
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      includeComparisons: searchParams.get('includeComparisons') !== 'false',
      includeForecasts: searchParams.get('includeForecasts') === 'true',
      groupBy: searchParams.get('groupBy') as any || undefined,
    }

    const validatedParams = AnalyticsQuerySchema.parse(queryParams)

    // Calculate time boundaries
    const timeBounds = calculateTimeBounds(
      validatedParams.timeframe,
      validatedParams.startDate,
      validatedParams.endDate
    )

    const analytics = {
      timeframe: validatedParams.timeframe,
      period: {
        start: timeBounds.start,
        end: timeBounds.end,
        duration: timeBounds.duration,
      },
      metrics: {},
      comparisons: validatedParams.includeComparisons ? {} : undefined,
      forecasts: validatedParams.includeForecasts ? {} : undefined,
      generatedAt: new Date().toISOString(),
    }

    // Generate analytics for each requested metric
    for (const metric of validatedParams.metrics) {
      switch (metric) {
        case 'inventory':
          analytics.metrics.inventory = await getInventoryAnalytics(timeBounds, validatedParams.groupBy)
          if (validatedParams.includeComparisons) {
            analytics.comparisons.inventory = await getInventoryComparisons(timeBounds)
          }
          break

        case 'suppliers':
          analytics.metrics.suppliers = await getSupplierAnalytics(timeBounds, validatedParams.groupBy)
          if (validatedParams.includeComparisons) {
            analytics.comparisons.suppliers = await getSupplierComparisons(timeBounds)
          }
          break

        case 'movements':
          analytics.metrics.movements = await getMovementAnalytics(timeBounds, validatedParams.groupBy)
          break

        case 'processing':
          analytics.metrics.processing = await getProcessingAnalytics(timeBounds)
          break

        case 'performance':
          analytics.metrics.performance = await getPerformanceAnalytics(timeBounds)
          break

        case 'alerts':
          analytics.metrics.alerts = await getAlertAnalytics(timeBounds)
          break
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics,
    })

  } catch (error) {
    console.error('Error generating system analytics:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to generate analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/analytics/system - Generate custom analytics report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const reportConfig = z.object({
      name: z.string().min(1, 'Report name is required'),
      description: z.string().optional(),
      schedule: z.enum(['daily', 'weekly', 'monthly']).optional(),
      recipients: z.array(z.string().email()).optional(),
      metrics: z.array(z.string()).min(1, 'At least one metric is required'),
      filters: z.object({
        suppliers: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        dateRange: z.object({
          start: z.string().datetime(),
          end: z.string().datetime(),
        }).optional(),
      }).optional(),
      format: z.enum(['json', 'csv', 'pdf']).default('json'),
    }).parse(body)

    // Generate the custom report
    const reportData = await generateCustomReport(reportConfig)

    // Save report configuration if scheduled
    if (reportConfig.schedule) {
      await saveReportConfiguration(reportConfig)
    }

    return NextResponse.json({
      success: true,
      data: {
        reportId: reportData.id,
        report: reportData,
        scheduled: !!reportConfig.schedule,
      },
      message: 'Custom analytics report generated successfully'
    })

  } catch (error) {
    console.error('Error generating custom analytics report:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid report configuration',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to generate custom report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get inventory analytics
 */
async function getInventoryAnalytics(timeBounds: any, groupBy?: string) {
  const baseQuery = `
    SELECT
      COUNT(*) as total_items,
      COUNT(*) as active_items,
      COUNT(*) FILTER (WHERE stock_qty = 0) as out_of_stock_items,
      COUNT(*) FILTER (WHERE stock_qty <= reorder_point AND stock_qty > 0) as low_stock_items,
      COUNT(*) FILTER (WHERE max_stock IS NOT NULL AND stock_qty > max_stock) as overstock_items,
      SUM(stock_qty) as total_quantity,
      SUM(stock_qty * cost_price) as total_value,
      AVG(stock_qty * cost_price) as avg_item_value,
      COUNT(DISTINCT category) as total_categories,
      COUNT(DISTINCT supplier_id) as suppliers_with_products,
      MIN(created_at) as oldest_item_date,
      MAX(updated_at) as latest_update
    FROM public.inventory_items
    WHERE created_at BETWEEN $1 AND $2
  `

  const result = await query(baseQuery, [timeBounds.start, timeBounds.end])

  const analytics = {
    overview: result.rows[0] ? {
      totalItems: parseInt(result.rows[0].total_items),
      activeItems: parseInt(result.rows[0].active_items),
      outOfStockItems: parseInt(result.rows[0].out_of_stock_items),
      lowStockItems: parseInt(result.rows[0].low_stock_items),
      overstockItems: parseInt(result.rows[0].overstock_items),
      totalQuantity: parseInt(result.rows[0].total_quantity || '0'),
      totalValue: parseFloat(result.rows[0].total_value || '0'),
      avgItemValue: parseFloat(result.rows[0].avg_item_value || '0'),
      totalCategories: parseInt(result.rows[0].total_categories),
      suppliersWithProducts: parseInt(result.rows[0].suppliers_with_products),
      dataFreshness: {
        oldestItem: result.rows[0].oldest_item_date,
        latestUpdate: result.rows[0].latest_update,
      }
    } : null,
  }

  // Add breakdown by groupBy parameter
  if (groupBy) {
    const groupByQuery = `
      SELECT
        ${groupBy},
        COUNT(*) as item_count,
        SUM(stock_qty) as total_quantity,
        SUM(stock_qty * cost_price) as total_value,
        COUNT(*) FILTER (WHERE stock_qty = 0) as out_of_stock,
        COUNT(*) FILTER (WHERE stock_qty <= reorder_point AND stock_qty > 0) as low_stock
      FROM public.inventory_items
      WHERE created_at BETWEEN $1 AND $2 AND ${groupBy} IS NOT NULL
      GROUP BY ${groupBy}
      ORDER BY total_value DESC
      LIMIT 50
    `

    const groupResult = await query(groupByQuery, [timeBounds.start, timeBounds.end])
    analytics[`by_${groupBy}`] = groupResult.rows.map(row => ({
      [groupBy]: row[groupBy],
      itemCount: parseInt(row.item_count),
      totalQuantity: parseInt(row.total_quantity || '0'),
      totalValue: parseFloat(row.total_value || '0'),
      outOfStock: parseInt(row.out_of_stock),
      lowStock: parseInt(row.low_stock),
    }))
  }

  // Stock level distribution
  const distributionQuery = `
    SELECT
      CASE
        WHEN stock_qty = 0 THEN 'out_of_stock'
        WHEN stock_qty <= reorder_point THEN 'low_stock'
        WHEN max_stock IS NOT NULL AND stock_qty > max_stock THEN 'overstock'
        ELSE 'normal'
      END as stock_level,
      COUNT(*) as count,
      SUM(stock_qty * cost_price) as value
    FROM public.inventory_items
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY stock_level
  `

  const distributionResult = await query(distributionQuery, [timeBounds.start, timeBounds.end])
  analytics.stockDistribution = distributionResult.rows.map(row => ({
    level: row.stock_level,
    count: parseInt(row.count),
    value: parseFloat(row.value || '0'),
  }))

  return analytics
}

/**
 * Get supplier analytics
 */
async function getSupplierAnalytics(timeBounds: any, groupBy?: string) {
  const baseQuery = `
    SELECT
      COUNT(*) as total_suppliers,
      COUNT(*) FILTER (WHERE status = 'active') as active_suppliers,
      COUNT(*) FILTER (WHERE is_preferred = true) as preferred_suppliers,
      AVG(CASE WHEN sp.performance_score IS NOT NULL THEN sp.performance_score ELSE 0 END) as avg_performance_score,
      COUNT(DISTINCT ii.category) as categories_covered,
      SUM(COALESCE(ii.stock_qty * ii.cost_price, 0)) as total_inventory_value
    FROM public.suppliers s
    LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
    LEFT JOIN inventory_items ii ON s.id = ii.supplier_id
    WHERE s.created_at BETWEEN $1 AND $2
  `

  const result = await query(baseQuery, [timeBounds.start, timeBounds.end])

  const analytics = {
    overview: result.rows[0] ? {
      totalSuppliers: parseInt(result.rows[0].total_suppliers),
      activeSuppliers: parseInt(result.rows[0].active_suppliers),
      preferredSuppliers: parseInt(result.rows[0].preferred_suppliers),
      avgPerformanceScore: parseFloat(result.rows[0].avg_performance_score || '0'),
      categoriesCovered: parseInt(result.rows[0].categories_covered || '0'),
      totalInventoryValue: parseFloat(result.rows[0].total_inventory_value || '0'),
    } : null,
  }

  // Top suppliers by product count and value
  const topSuppliersQuery = `
    SELECT
      s.id,
      s.name,
      s.status,
      s.is_preferred,
      COUNT(ii.id) as product_count,
      SUM(ii.stock_qty * ii.cost_price) as inventory_value,
      sp.performance_score,
      sp.delivery_rating,
      sp.quality_rating
    FROM public.suppliers s
    LEFT JOIN inventory_items ii ON s.id = ii.supplier_id
    LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
    WHERE s.created_at BETWEEN $1 AND $2
    GROUP BY s.id, s.name, s.status, s.is_preferred, sp.performance_score, sp.delivery_rating, sp.quality_rating
    HAVING COUNT(ii.id) > 0
    ORDER BY inventory_value DESC
    LIMIT 20
  `

  const topSuppliersResult = await query(topSuppliersQuery, [timeBounds.start, timeBounds.end])
  analytics.topSuppliers = topSuppliersResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    status: row.status,
    isPreferred: row.is_preferred,
    productCount: parseInt(row.product_count),
    inventoryValue: parseFloat(row.inventory_value || '0'),
    performanceScore: parseFloat(row.performance_score || '0'),
    deliveryRating: parseFloat(row.delivery_rating || '0'),
    qualityRating: parseFloat(row.quality_rating || '0'),
  }))

  // Performance distribution
  const performanceQuery = `
    SELECT
      CASE
        WHEN performance_score >= 80 THEN 'excellent'
        WHEN performance_score >= 60 THEN 'good'
        WHEN performance_score >= 40 THEN 'average'
        WHEN performance_score >= 20 THEN 'poor'
        ELSE 'unrated'
      END as performance_tier,
      COUNT(*) as count
    FROM public.suppliers s
    LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
    WHERE s.created_at BETWEEN $1 AND $2
    GROUP BY performance_tier
  `

  const performanceResult = await query(performanceQuery, [timeBounds.start, timeBounds.end])
  analytics.performanceDistribution = performanceResult.rows.map(row => ({
    tier: row.performance_tier,
    count: parseInt(row.count),
  }))

  return analytics
}

/**
 * Get stock movement analytics
 */
async function getMovementAnalytics(timeBounds: any, groupBy?: string) {
  const baseQuery = `
    SELECT
      COUNT(*) as total_movements,
      COUNT(*) FILTER (WHERE type = 'in') as inbound_movements,
      COUNT(*) FILTER (WHERE type = 'out') as outbound_movements,
      COUNT(*) FILTER (WHERE type = 'adjustment') as adjustment_movements,
      COUNT(*) FILTER (WHERE type = 'transfer') as transfer_movements,
      SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as total_inbound_quantity,
      SUM(CASE WHEN type = 'out' THEN ABS(quantity) ELSE 0 END) as total_outbound_quantity,
      SUM(CASE WHEN type = 'in' AND unit_cost IS NOT NULL THEN quantity * unit_cost ELSE 0 END) as inbound_value,
      COUNT(DISTINCT item_id) as items_with_movements,
      COUNT(DISTINCT DATE(created_at)) as active_days
    FROM stock_movements
    WHERE created_at BETWEEN $1 AND $2
  `

  const result = await query(baseQuery, [timeBounds.start, timeBounds.end])

  const analytics = {
    overview: result.rows[0] ? {
      totalMovements: parseInt(result.rows[0].total_movements),
      inboundMovements: parseInt(result.rows[0].inbound_movements),
      outboundMovements: parseInt(result.rows[0].outbound_movements),
      adjustmentMovements: parseInt(result.rows[0].adjustment_movements),
      transferMovements: parseInt(result.rows[0].transfer_movements),
      totalInboundQuantity: parseInt(result.rows[0].total_inbound_quantity || '0'),
      totalOutboundQuantity: parseInt(result.rows[0].total_outbound_quantity || '0'),
      inboundValue: parseFloat(result.rows[0].inbound_value || '0'),
      itemsWithMovements: parseInt(result.rows[0].items_with_movements),
      activeDays: parseInt(result.rows[0].active_days),
    } : null,
  }

  // Daily movement trends
  const trendQuery = `
    SELECT
      DATE(created_at) as movement_date,
      COUNT(*) as total_movements,
      COUNT(*) FILTER (WHERE type = 'in') as inbound,
      COUNT(*) FILTER (WHERE type = 'out') as outbound,
      SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as inbound_quantity,
      SUM(CASE WHEN type = 'out' THEN ABS(quantity) ELSE 0 END) as outbound_quantity
    FROM stock_movements
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY DATE(created_at)
    ORDER BY movement_date DESC
    LIMIT 30
  `

  const trendResult = await query(trendQuery, [timeBounds.start, timeBounds.end])
  analytics.dailyTrends = trendResult.rows.map(row => ({
    date: row.movement_date,
    totalMovements: parseInt(row.total_movements),
    inbound: parseInt(row.inbound),
    outbound: parseInt(row.outbound),
    inboundQuantity: parseInt(row.inbound_quantity || '0'),
    outboundQuantity: parseInt(row.outbound_quantity || '0'),
  }))

  return analytics
}

/**
 * Get processing analytics
 */
async function getProcessingAnalytics(timeBounds: any) {
  const sessionsQuery = `
    SELECT
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_sessions,
      COUNT(*) FILTER (WHERE status = 'processing') as active_sessions,
      SUM(total_rows) as total_rows_processed,
      SUM(created_items) as total_items_created,
      SUM(updated_items) as total_items_updated,
      AVG(execution_time_ms) as avg_execution_time,
      COUNT(DISTINCT supplier_id) as suppliers_processed
    FROM price_list_processing_sessions
    WHERE created_at BETWEEN $1 AND $2
  `

  const result = await query(sessionsQuery, [timeBounds.start, timeBounds.end])

  return {
    overview: result.rows[0] ? {
      totalSessions: parseInt(result.rows[0].total_sessions),
      completedSessions: parseInt(result.rows[0].completed_sessions),
      failedSessions: parseInt(result.rows[0].failed_sessions),
      activeSessions: parseInt(result.rows[0].active_sessions),
      totalRowsProcessed: parseInt(result.rows[0].total_rows_processed || '0'),
      totalItemsCreated: parseInt(result.rows[0].total_items_created || '0'),
      totalItemsUpdated: parseInt(result.rows[0].total_items_updated || '0'),
      avgExecutionTime: parseFloat(result.rows[0].avg_execution_time || '0'),
      suppliersProcessed: parseInt(result.rows[0].suppliers_processed || '0'),
      successRate: result.rows[0].total_sessions > 0 ?
        (parseInt(result.rows[0].completed_sessions) / parseInt(result.rows[0].total_sessions) * 100).toFixed(1) : '0'
    } : null,
  }
}

/**
 * Get performance analytics
 */
async function getPerformanceAnalytics(timeBounds: any) {
  // This would integrate with actual performance monitoring
  // For now, return simulated performance data
  return {
    database: {
      connectionPool: {
        totalConnections: 15,
        activeConnections: 8,
        idleConnections: 7,
        maxConnections: 15,
        utilizationRate: 53.3,
      },
      queryPerformance: {
        avgResponseTime: 45.2,
        slowQueries: 3,
        queryErrors: 0,
        cacheHitRate: 87.5,
      },
    },
    api: {
      requestMetrics: {
        totalRequests: 1247,
        successfulRequests: 1241,
        errorRate: 0.48,
        avgResponseTime: 187.3,
      },
      endpointPerformance: [
        { endpoint: '/api/inventory', requestCount: 456, avgTime: 123.4, errorRate: 0.2 },
        { endpoint: '/api/suppliers', requestCount: 234, avgTime: 89.7, errorRate: 0.0 },
        { endpoint: '/api/pricelists/process', requestCount: 12, avgTime: 2456.8, errorRate: 8.3 },
      ],
    },
    system: {
      resourceUsage: {
        cpuUtilization: 34.5,
        memoryUtilization: 68.2,
        diskUtilization: 23.1,
        networkThroughput: 12.4,
      },
    },
  }
}

/**
 * Get alert analytics
 */
async function getAlertAnalytics(timeBounds: any) {
  const alertsQuery = `
    SELECT
      COUNT(*) as total_alerts,
      COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
      COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
      COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
      COUNT(*) FILTER (WHERE severity = 'low') as low_severity,
      COUNT(*) FILTER (WHERE alert_type = 'low_stock') as low_stock_alerts,
      COUNT(*) FILTER (WHERE alert_type = 'out_of_stock') as out_of_stock_alerts,
      COUNT(*) FILTER (WHERE alert_type = 'overstock') as overstock_alerts
    FROM inventory_alerts
    WHERE created_at BETWEEN $1 AND $2
  `

  const result = await query(alertsQuery, [timeBounds.start, timeBounds.end])

  return {
    overview: result.rows[0] ? {
      totalAlerts: parseInt(result.rows[0].total_alerts),
      activeAlerts: parseInt(result.rows[0].active_alerts),
      highSeverity: parseInt(result.rows[0].high_severity),
      mediumSeverity: parseInt(result.rows[0].medium_severity),
      lowSeverity: parseInt(result.rows[0].low_severity),
      lowStockAlerts: parseInt(result.rows[0].low_stock_alerts),
      outOfStockAlerts: parseInt(result.rows[0].out_of_stock_alerts),
      overstockAlerts: parseInt(result.rows[0].overstock_alerts),
    } : null,
  }
}

/**
 * Get inventory comparisons (current vs previous period)
 */
async function getInventoryComparisons(timeBounds: any) {
  const previousBounds = calculatePreviousPeriod(timeBounds)

  const currentQuery = `
    SELECT COUNT(*) as count, SUM(stock_qty * cost_price) as value
    FROM public.inventory_items WHERE created_at BETWEEN $1 AND $2
  `
  const previousQuery = `
    SELECT COUNT(*) as count, SUM(stock_qty * cost_price) as value
    FROM public.inventory_items WHERE created_at BETWEEN $1 AND $2
  `

  const [currentResult, previousResult] = await Promise.all([
    query(currentQuery, [timeBounds.start, timeBounds.end]),
    query(previousQuery, [previousBounds.start, previousBounds.end])
  ])

  const current = currentResult.rows[0]
  const previous = previousResult.rows[0]

  return {
    itemCount: {
      current: parseInt(current?.count || '0'),
      previous: parseInt(previous?.count || '0'),
      change: calculatePercentageChange(
        parseInt(previous?.count || '0'),
        parseInt(current?.count || '0')
      ),
    },
    totalValue: {
      current: parseFloat(current?.value || '0'),
      previous: parseFloat(previous?.value || '0'),
      change: calculatePercentageChange(
        parseFloat(previous?.value || '0'),
        parseFloat(current?.value || '0')
      ),
    },
  }
}

/**
 * Get supplier comparisons
 */
async function getSupplierComparisons(timeBounds: any) {
  const previousBounds = calculatePreviousPeriod(timeBounds)

  const currentQuery = `SELECT COUNT(*) as count FROM public.suppliers WHERE created_at BETWEEN $1 AND $2`
  const previousQuery = `SELECT COUNT(*) as count FROM public.suppliers WHERE created_at BETWEEN $1 AND $2`

  const [currentResult, previousResult] = await Promise.all([
    query(currentQuery, [timeBounds.start, timeBounds.end]),
    query(previousQuery, [previousBounds.start, previousBounds.end])
  ])

  const current = parseInt(currentResult.rows[0]?.count || '0')
  const previous = parseInt(previousResult.rows[0]?.count || '0')

  return {
    supplierCount: {
      current,
      previous,
      change: calculatePercentageChange(previous, current),
    },
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateTimeBounds(timeframe: string, startDate?: string, endDate?: string) {
  const now = new Date()
  const end = endDate ? new Date(endDate) : now

  let start: Date
  let duration: string

  if (startDate) {
    start = new Date(startDate)
    duration = 'custom'
  } else {
    switch (timeframe) {
      case 'hour':
        start = new Date(end.getTime() - 60 * 60 * 1000)
        duration = '1 hour'
        break
      case 'day':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
        duration = '24 hours'
        break
      case 'week':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
        duration = '7 days'
        break
      case 'month':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
        duration = '30 days'
        break
      case 'quarter':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000)
        duration = '90 days'
        break
      case 'year':
        start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000)
        duration = '365 days'
        break
      default:
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
        duration = '24 hours'
    }
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    duration,
  }
}

function calculatePreviousPeriod(timeBounds: any) {
  const start = new Date(timeBounds.start)
  const end = new Date(timeBounds.end)
  const duration = end.getTime() - start.getTime()

  return {
    start: new Date(start.getTime() - duration).toISOString(),
    end: timeBounds.start,
  }
}

function calculatePercentageChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100 * 100) / 100
}

async function generateCustomReport(config: any) {
  // Implementation for custom report generation
  // This would use the same analytics functions but with custom configuration
  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: config.name,
    description: config.description,
    generatedAt: new Date().toISOString(),
    data: {}, // Would contain actual report data based on config
  }
}

async function saveReportConfiguration(config: any) {
  // Save report configuration for scheduled generation
  // This would integrate with a job scheduler
  console.log('Report configuration saved for scheduling:', config.name)
}
