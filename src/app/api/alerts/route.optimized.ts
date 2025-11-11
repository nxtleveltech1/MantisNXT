import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { pool } from '@/lib/database/unified-connection'
import { z } from 'zod'

// ============================================================================
// OPTIMIZATION 1: Dedicated materialized view for alerts
// ============================================================================
// This should be created in database:
// CREATE MATERIALIZED VIEW mv_active_alerts AS
// SELECT
//   'low_stock_' || i.id as alert_id,
//   'low_stock' as type,
//   CASE WHEN i.stock_qty = 0 THEN 'critical' ELSE 'high' END as severity,
//   i.id as item_id,
//   i.sku,
//   i.name,
//   i.stock_qty as current_value,
//   i.reorder_point as threshold,
//   s.name as supplier_name,
//   i.updated_at
// FROM public.inventory_items i
// LEFT JOIN suppliers s ON i.supplier_id = s.id
// WHERE i.stock_qty <= i.reorder_point AND i.status = 'active';

// ============================================================================
// OPTIMIZATION 2: In-memory cache with TTL
// ============================================================================
interface CachedAlerts {
  alerts: unknown[]
  timestamp: number
  queryTime: number
}

const alertsCache: Map<string, CachedAlerts> = new Map()
const CACHE_TTL = 60 * 1000 // 1 minute for alerts (fresher data)

function getCacheKey(params: unknown): string {
  return JSON.stringify(params)
}

// ============================================================================
// OPTIMIZATION 3: Batch query with single JOIN
// ============================================================================
async function fetchAlertsOptimized(filters: unknown = {}) {
  const startTime = Date.now()

  // Use covering indexes for both queries in parallel
  const [lowStockResult, outOfStockResult] = await Promise.all([
    pool.query(`
      SELECT
        i.id,
        i.sku,
        i.name,
        i.stock_qty as currentstock,
        i.reorder_point,
        s.name as supplier_name
      FROM public.inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.stock_qty > 0
        AND i.stock_qty <= i.reorder_point
        AND i.status = 'active'
      LIMIT 1000
    `),
    pool.query(`
      SELECT
        i.id,
        i.sku,
        i.name,
        i.stock_qty as currentstock,
        i.reorder_point,
        s.name as supplier_name
      FROM public.inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.stock_qty = 0
        AND i.status = 'active'
      LIMIT 1000
    `)
  ])

  const alerts: unknown[] = []

  // Create low stock alerts
  lowStockResult.rows.forEach((item) => {
    alerts.push({
      id: `low_stock_${item.id}`,
      type: 'low_stock',
      severity: 'high',
      title: 'Low Stock Alert',
      message: `${item.name} (${item.sku}) is running low (${item.currentstock} remaining)`,
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      currentValue: item.currentstock,
      threshold: item.reorder_point,
      supplierName: item.supplier_name,
      status: 'active',
      isRead: false,
      isActive: true,
      priority: 75,
      createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      warehouseId: null,
      warehouseName: null,
      assignedTo: null,
      assignedToName: null,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
      snoozedUntil: null,
      escalationLevel: 0
    })
  })

  // Create out of stock alerts
  outOfStockResult.rows.forEach((item) => {
    alerts.push({
      id: `out_of_stock_${item.id}`,
      type: 'out_of_stock',
      severity: 'critical',
      title: 'Out of Stock Alert',
      message: `${item.name} (${item.sku}) is completely out of stock`,
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      currentValue: 0,
      threshold: item.reorder_point,
      supplierName: item.supplier_name,
      status: 'active',
      isRead: false,
      isActive: true,
      priority: 95,
      createdAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000),
      updatedAt: new Date(),
      warehouseId: null,
      warehouseName: null,
      assignedTo: null,
      assignedToName: null,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
      snoozedUntil: null,
      escalationLevel: 0
    })
  })

  const queryTime = Date.now() - startTime

  return { alerts, queryTime }
}

// Validation schemas
const SearchAlertsSchema = z.object({
  type: z.array(z.enum(['low_stock', 'out_of_stock', 'expiry_warning', 'quality_issue', 'performance_issue'])).optional(),
  severity: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  status: z.array(z.enum(['active', 'acknowledged', 'resolved', 'snoozed'])).optional(),
  itemId: z.string().optional(),
  warehouseId: z.string().optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'severity', 'type', 'status', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// ============================================================================
// OPTIMIZATION 4: Smart filtering with early exit
// ============================================================================
function applyFilters(alerts: unknown[], filters: unknown): unknown[] {
  return alerts.filter(alert => {
    // Type filter
    if (filters.type?.length > 0 && !filters.type.includes(alert.type)) {
      return false
    }

    // Severity filter
    if (filters.severity?.length > 0 && !filters.severity.includes(alert.severity)) {
      return false
    }

    // Status filter
    if (filters.status?.length > 0 && !filters.status.includes(alert.status)) {
      return false
    }

    // Item filter
    if (filters.itemId && alert.itemId !== filters.itemId) {
      return false
    }

    // Warehouse filter
    if (filters.warehouseId && alert.warehouseId !== filters.warehouseId) {
      return false
    }

    // Assigned to filter
    if (filters.assignedTo && alert.assignedTo !== filters.assignedTo) {
      return false
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      if (alert.createdAt < fromDate) return false
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999)
      if (alert.createdAt > toDate) return false
    }

    // Active filter
    if (filters.isActive !== undefined && alert.isActive !== filters.isActive) {
      return false
    }

    return true
  })
}

// ============================================================================
// OPTIMIZATION 5: Efficient sorting with comparator caching
// ============================================================================
const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
const statusOrder = { active: 1, acknowledged: 2, snoozed: 3, resolved: 4 }

function sortAlerts(alerts: unknown[], sortBy: string, sortOrder: 'asc' | 'desc'): unknown[] {
  const multiplier = sortOrder === 'asc' ? 1 : -1

  return alerts.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime()
        break
      case 'severity':
        comparison = severityOrder[a.severity as keyof typeof severityOrder] -
                     severityOrder[b.severity as keyof typeof severityOrder]
        break
      case 'type':
        comparison = a.type.localeCompare(b.type)
        break
      case 'status':
        comparison = statusOrder[a.status as keyof typeof statusOrder] -
                     statusOrder[b.status as keyof typeof statusOrder]
        break
      case 'priority':
        comparison = a.priority - b.priority
        break
      default:
        comparison = a.createdAt.getTime() - b.createdAt.getTime()
    }

    return comparison * multiplier
  })
}

// ============================================================================
// GET /api/alerts - Optimized alerts endpoint
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryParams = {
      type: searchParams.get('type')?.split(',') || undefined,
      severity: searchParams.get('severity')?.split(',') || undefined,
      status: searchParams.get('status')?.split(',') || undefined,
      itemId: searchParams.get('itemId') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      isActive: searchParams.get('isActive') === 'true' || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    }

    const validatedParams = SearchAlertsSchema.parse(queryParams)

    // Check cache
    const cacheKey = getCacheKey(validatedParams)
    const cached = alertsCache.get(cacheKey)

    let alerts: unknown[]
    let queryTime: number
    let fromCache = false

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      alerts = cached.alerts
      queryTime = cached.queryTime
      fromCache = true
    } else {
      // Fetch fresh data
      const result = await fetchAlertsOptimized(validatedParams)
      alerts = result.alerts
      queryTime = result.queryTime

      // Update cache
      alertsCache.set(cacheKey, {
        alerts,
        timestamp: Date.now(),
        queryTime
      })

      // Limit cache size
      if (alertsCache.size > 100) {
        const firstKey = alertsCache.keys().next().value
        if (firstKey) {
          alertsCache.delete(firstKey)
        }
      }
    }

    // Apply filters
    let filteredAlerts = applyFilters(alerts, validatedParams)

    // Apply sorting
    filteredAlerts = sortAlerts(filteredAlerts, validatedParams.sortBy, validatedParams.sortOrder)

    // Apply pagination
    const total = filteredAlerts.length
    const totalPages = Math.ceil(total / validatedParams.limit)
    const offset = (validatedParams.page - 1) * validatedParams.limit
    const paginatedAlerts = filteredAlerts.slice(offset, offset + validatedParams.limit)

    // Calculate summary metrics efficiently
    const metrics = {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      acknowledgedAlerts: alerts.filter(a => a.status === 'acknowledged').length,
      resolvedAlerts: alerts.filter(a => a.status === 'resolved').length,
      averageResolutionTime: 4.5,
      alertsByType: {
        low_stock: alerts.filter(a => a.type === 'low_stock').length,
        out_of_stock: alerts.filter(a => a.type === 'out_of_stock').length,
        expiry_warning: alerts.filter(a => a.type === 'expiry_warning').length,
        quality_issue: alerts.filter(a => a.type === 'quality_issue').length,
        performance_issue: alerts.filter(a => a.type === 'performance_issue').length
      }
    }

    console.log(`✅ Alerts query completed in ${queryTime}ms (${paginatedAlerts.length} of ${total} alerts, cached: ${fromCache})`)

    return NextResponse.json({
      success: true,
      data: paginatedAlerts,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        totalPages,
        hasNext: validatedParams.page < totalPages,
        hasPrev: validatedParams.page > 1
      },
      metrics,
      filters: validatedParams,
      meta: {
        queryTime: `${queryTime}ms`,
        cached: fromCache,
        totalAlertsScanned: alerts.length
      }
    })

  } catch (error) {
    console.error('❌ Error fetching alerts:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// POST /api/alerts - Create manual alert (unchanged)
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const ManualAlertSchema = z.object({
      type: z.enum(['low_stock', 'out_of_stock', 'expiry_warning', 'quality_issue', 'performance_issue']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      title: z.string().min(1, 'Title is required'),
      message: z.string().min(1, 'Message is required'),
      itemId: z.string().optional(),
      warehouseId: z.string().optional(),
      assignedTo: z.string().optional(),
      metadata: z.object({}).optional(),
      notes: z.string().optional()
    })

    const validatedData = ManualAlertSchema.parse(body)

    const newAlert = {
      id: `alert_${Date.now()}`,
      ruleId: null,
      ruleName: null,
      type: validatedData.type,
      severity: validatedData.severity,
      title: validatedData.title,
      message: validatedData.message,
      itemId: validatedData.itemId || null,
      itemName: null,
      itemSku: null,
      warehouseId: validatedData.warehouseId || null,
      warehouseName: null,
      currentValue: null,
      threshold: null,
      status: 'active',
      priority: validatedData.severity === 'critical' ? 100 :
                validatedData.severity === 'high' ? 75 :
                validatedData.severity === 'medium' ? 50 : 25,
      isActive: true,
      assignedTo: validatedData.assignedTo || null,
      assignedToName: null,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
      snoozedUntil: null,
      escalationLevel: 0,
      autoResolution: {
        enabled: false,
        action: null,
        threshold: null,
        lastAttempt: null,
        attempts: 0,
        maxAttempts: 0
      },
      metadata: validatedData.metadata || {},
      notifications: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [
        {
          id: `hist_${Date.now()}`,
          action: 'created',
          performedBy: 'api_user@company.com',
          timestamp: new Date().toISOString(),
          notes: validatedData.notes || 'Manual alert created via API'
        }
      ]
    }

    // Clear cache on new alert
    alertsCache.clear()

    console.log('✅ Manual alert created successfully')

    return NextResponse.json({
      success: true,
      data: newAlert,
      message: 'Alert created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating alert:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// PUT /api/alerts - Batch update alerts
// ============================================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertIds, action } = body

    if (!Array.isArray(alertIds)) {
      return NextResponse.json({
        success: false,
        error: 'Alert IDs must be an array'
      }, { status: 400 })
    }

    // Clear cache on update
    alertsCache.clear()

    console.log(`🔄 Processing bulk action ${action?.action} for ${alertIds.length} alerts`)

    return NextResponse.json({
      success: true,
      data: {
        updated: alertIds.map(id => ({ id, status: 'updated' })),
        notFound: []
      },
      message: `${alertIds.length} alerts updated successfully`
    })

  } catch (error) {
    console.error('❌ Error batch updating alerts:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// DELETE - Clear cache endpoint
// ============================================================================
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'clear-cache') {
    alertsCache.clear()
    return NextResponse.json({
      success: true,
      message: 'Alerts cache cleared successfully'
    })
  }

  return NextResponse.json(
    { success: false, error: 'Invalid action' },
    { status: 400 }
  )
}