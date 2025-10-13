import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { query, withTransaction } from '@/lib/database'
import { withAuth } from '@/middleware/api-auth'

// ============================================================================
// ENHANCED INVENTORY API - REAL-TIME DATA MANAGEMENT
// Advanced inventory operations with comprehensive analytics
// ============================================================================

// Validation schemas
const CreateInventoryItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  supplierSku: z.string().optional(),
  costPrice: z.number().min(0, 'Cost price must be non-negative'),
  salePrice: z.number().min(0, 'Sale price must be non-negative').optional(),
  currency: z.string().default('ZAR'),
  stockQuantity: z.number().min(0, 'Stock quantity must be non-negative'),
  reservedQuantity: z.number().min(0, 'Reserved quantity must be non-negative').default(0),
  reorderPoint: z.number().min(0, 'Reorder point must be non-negative').default(10),
  maxStock: z.number().min(0, 'Max stock must be non-negative').optional(),
  unit: z.string().default('pcs'),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    unit: z.enum(['cm', 'mm', 'm', 'in', 'ft']).default('cm'),
  }).optional(),
  location: z.string().optional(),
  barcode: z.string().optional(),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  taxRate: z.number().min(0).max(100).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
  batchTracking: z.boolean().default(false),
  serialTracking: z.boolean().default(false),
  expirationTracking: z.boolean().default(false),
})

const StockMovementSchema = z.object({
  itemId: z.string().uuid(),
  movementType: z.enum(['in', 'out', 'adjustment', 'transfer']),
  quantity: z.number(),
  unitCost: z.number().min(0).optional(),
  reason: z.string().min(1, 'Reason is required'),
  reference: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  batchNumber: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  expirationDate: z.string().datetime().optional(),
})

const BulkUpdateSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    updates: z.record(z.string(), z.any()),
  })).min(1, 'At least one item is required'),
  reason: z.string().min(1, 'Update reason is required'),
  notes: z.string().optional(),
})

const AdvancedSearchSchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  suppliers: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.array(z.enum(['active', 'inactive', 'discontinued', 'out_of_stock'])).optional(),
  stockLevel: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock', 'overstock']).optional(),
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  lastUpdated: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).optional(),
  hasImages: z.boolean().optional(),
  batchTracked: z.boolean().optional(),
  serialTracked: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(500).default(50),
  sortBy: z.enum([
    'name', 'sku', 'category', 'brand', 'stock_qty', 'cost_price',
    'sale_price', 'value', 'created_at', 'updated_at', 'last_movement'
  ]).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeMovements: z.boolean().default(false),
  includeAlerts: z.boolean().default(false),
  includeMetrics: z.boolean().default(false),
})

/**
 * GET /api/inventory/enhanced - Advanced inventory search and analytics
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const queryParams = {
      query: searchParams.get('query') || undefined,
      categories: searchParams.get('categories')?.split(',') || undefined,
      brands: searchParams.get('brands')?.split(',') || undefined,
      suppliers: searchParams.get('suppliers')?.split(',') || undefined,
      locations: searchParams.get('locations')?.split(',') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      status: searchParams.get('status')?.split(',') as any || undefined,
      stockLevel: searchParams.get('stockLevel') as any || undefined,
      priceRange: {
        min: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
        max: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      },
      lastUpdated: {
        from: searchParams.get('updatedFrom') || undefined,
        to: searchParams.get('updatedTo') || undefined,
      },
      hasImages: searchParams.get('hasImages') === 'true' || undefined,
      batchTracked: searchParams.get('batchTracked') === 'true' || undefined,
      serialTracked: searchParams.get('serialTracked') === 'true' || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sortBy: searchParams.get('sortBy') as any || 'name',
      sortOrder: searchParams.get('sortOrder') as any || 'asc',
      includeMovements: searchParams.get('includeMovements') === 'true',
      includeAlerts: searchParams.get('includeAlerts') === 'true',
      includeMetrics: searchParams.get('includeMetrics') === 'true',
    }

    const validatedParams = AdvancedSearchSchema.parse(queryParams)

    // Build complex query with joins
    let baseQuery = `
      SELECT
        ii.*,
        s.name as supplier_name,
        s.code as supplier_code,
        COALESCE(ii.available_qty, ii.stock_qty - COALESCE(ii.reserved_qty, 0)) as available_quantity,
        (ii.stock_qty * ii.cost_price) as inventory_value,
        CASE
          WHEN ii.stock_qty = 0 THEN 'out_of_stock'
          WHEN ii.stock_qty <= ii.reorder_point THEN 'low_stock'
          WHEN ii.max_stock IS NOT NULL AND ii.stock_qty > ii.max_stock THEN 'overstock'
          ELSE 'normal'
        END as stock_status,
        (SELECT COUNT(*) FROM stock_movements sm WHERE sm.item_id = ii.id) as movement_count,
        (SELECT MAX(sm.created_at) FROM stock_movements sm WHERE sm.item_id = ii.id) as last_movement_date
      FROM inventory_items ii
      LEFT JOIN suppliers s ON ii.supplier_id = s.id
      WHERE 1=1
    `

    const queryValues: any[] = []
    let paramIndex = 1

    // Apply search filters
    if (validatedParams.query) {
      baseQuery += ` AND (
        ii.name ILIKE $${paramIndex} OR
        ii.sku ILIKE $${paramIndex} OR
        ii.description ILIKE $${paramIndex} OR
        ii.brand ILIKE $${paramIndex} OR
        ii.barcode = $${paramIndex} OR
        $${paramIndex} = ANY(ii.tags)
      )`
      queryValues.push(`%${validatedParams.query}%`)
      paramIndex++
    }

    if (validatedParams.categories && validatedParams.categories.length > 0) {
      baseQuery += ` AND ii.category = ANY($${paramIndex})`
      queryValues.push(validatedParams.categories)
      paramIndex++
    }

    if (validatedParams.brands && validatedParams.brands.length > 0) {
      baseQuery += ` AND ii.brand = ANY($${paramIndex})`
      queryValues.push(validatedParams.brands)
      paramIndex++
    }

    if (validatedParams.suppliers && validatedParams.suppliers.length > 0) {
      baseQuery += ` AND (s.id = ANY($${paramIndex}) OR s.name = ANY($${paramIndex}))`
      queryValues.push(validatedParams.suppliers)
      paramIndex++
    }

    if (validatedParams.locations && validatedParams.locations.length > 0) {
      baseQuery += ` AND ii.location = ANY($${paramIndex})`
      queryValues.push(validatedParams.locations)
      paramIndex++
    }

    if (validatedParams.tags && validatedParams.tags.length > 0) {
      baseQuery += ` AND ii.tags && $${paramIndex}`
      queryValues.push(validatedParams.tags)
      paramIndex++
    }

    // Note: Skipping status filter because inventory_items.status is not available in the current DB

    // Stock level filtering
    if (validatedParams.stockLevel && validatedParams.stockLevel !== 'all') {
      switch (validatedParams.stockLevel) {
        case 'in_stock':
          baseQuery += ` AND ii.stock_qty > 0`
          break
        case 'low_stock':
          baseQuery += ` AND ii.stock_qty > 0 AND ii.stock_qty <= ii.reorder_point`
          break
        case 'out_of_stock':
          baseQuery += ` AND ii.stock_qty = 0`
          break
        case 'overstock':
          baseQuery += ` AND ii.max_stock IS NOT NULL AND ii.stock_qty > ii.max_stock`
          break
      }
    }

    // Price range filtering
    if (validatedParams.priceRange.min !== undefined) {
      baseQuery += ` AND ii.cost_price >= $${paramIndex}`
      queryValues.push(validatedParams.priceRange.min)
      paramIndex++
    }

    if (validatedParams.priceRange.max !== undefined) {
      baseQuery += ` AND ii.cost_price <= $${paramIndex}`
      queryValues.push(validatedParams.priceRange.max)
      paramIndex++
    }

    // Date range filtering
    if (validatedParams.lastUpdated.from) {
      baseQuery += ` AND ii.updated_at >= $${paramIndex}`
      queryValues.push(validatedParams.lastUpdated.from)
      paramIndex++
    }

    if (validatedParams.lastUpdated.to) {
      baseQuery += ` AND ii.updated_at <= $${paramIndex}`
      queryValues.push(validatedParams.lastUpdated.to)
      paramIndex++
    }

    // Additional filters
    if (validatedParams.hasImages) {
      baseQuery += ` AND array_length(ii.images, 1) > 0`
    }

    if (validatedParams.batchTracked) {
      baseQuery += ` AND ii.batch_tracking = true`
    }

    if (validatedParams.serialTracked) {
      baseQuery += ` AND ii.serial_tracking = true`
    }

    // Get total count
    const countQuery = baseQuery.replace(
      /SELECT[\s\S]*?FROM/i,
      'SELECT COUNT(DISTINCT ii.id) FROM'
    )
    const countResult = await query(countQuery, queryValues)
    const total = parseInt(countResult.rows[0]?.count || '0')

    // Apply sorting
    let orderBy = ' ORDER BY '
    switch (validatedParams.sortBy) {
      case 'name':
        orderBy += 'ii.name'
        break
      case 'sku':
        orderBy += 'ii.sku'
        break
      case 'category':
        orderBy += 'ii.category'
        break
      case 'brand':
        orderBy += 'ii.brand'
        break
      case 'stock_qty':
        orderBy += 'ii.stock_qty'
        break
      case 'cost_price':
        orderBy += 'ii.cost_price'
        break
      case 'sale_price':
        orderBy += 'ii.sale_price'
        break
      case 'value':
        orderBy += '(ii.stock_qty * ii.cost_price)'
        break
      case 'created_at':
        orderBy += 'ii.created_at'
        break
      case 'updated_at':
        orderBy += 'ii.updated_at'
        break
      case 'last_movement':
        orderBy += 'last_movement_date'
        break
      default:
        orderBy += 'ii.name'
    }
    orderBy += ` ${validatedParams.sortOrder === 'desc' ? 'DESC' : 'ASC'} NULLS LAST`

    // Add pagination
    const offset = (validatedParams.page - 1) * validatedParams.limit
    const finalQuery = baseQuery + orderBy + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryValues.push(validatedParams.limit, offset)

    // Execute main query
    const result = await query(finalQuery, queryValues)

    // Transform and enrich results
    const inventoryItems = await Promise.all(result.rows.map(async (row: any) => {
      const item = {
        id: row.id,
        sku: row.sku,
        name: row.name,
        description: row.description,
        category: row.category,
        subcategory: row.subcategory,
        brand: row.brand,
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        supplierCode: row.supplier_code,
        supplierSku: row.supplier_sku,
        costPrice: parseFloat(row.cost_price),
        salePrice: row.sale_price ? parseFloat(row.sale_price) : null,
        currency: row.currency,
        stockQuantity: parseInt(row.stock_qty),
        reservedQuantity: parseInt(row.reserved_qty || '0'),
        availableQuantity: parseInt(row.available_quantity),
        reorderPoint: parseInt(row.reorder_point),
        maxStock: row.max_stock ? parseInt(row.max_stock) : null,
        unit: row.unit,
        weight: row.weight ? parseFloat(row.weight) : null,
        dimensions: row.dimensions,
        location: row.location,
        barcode: row.barcode,
        tags: row.tags || [],
        images: row.images || [],
        status: row.status,
        stockStatus: row.stock_status,
        inventoryValue: parseFloat(row.inventory_value || '0'),
        movementCount: parseInt(row.movement_count || '0'),
        lastMovementDate: row.last_movement_date,
        taxRate: row.tax_rate ? parseFloat(row.tax_rate) : null,
        customFields: row.custom_fields || {},
        notes: row.notes,
        batchTracking: row.batch_tracking || false,
        serialTracking: row.serial_tracking || false,
        expirationTracking: row.expiration_tracking || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }

      // Add recent movements if requested
      if (validatedParams.includeMovements && row.movement_count > 0) {
        const movementsResult = await query(`
          SELECT id, movement_type, quantity, unit_cost, reason, reference,
                 location, notes, created_at, created_by
          FROM stock_movements
          WHERE item_id = $1
          ORDER BY created_at DESC
          LIMIT 5
        `, [row.id])

        item.recentMovements = movementsResult.rows
      }

      // Add alerts if requested
      if (validatedParams.includeAlerts) {
        const alerts = []

        if (item.stockQuantity === 0) {
          alerts.push({
            type: 'out_of_stock',
            severity: 'high',
            message: `${item.name} is out of stock`,
            createdAt: new Date(),
          })
        } else if (item.stockQuantity <= item.reorderPoint) {
          alerts.push({
            type: 'low_stock',
            severity: 'medium',
            message: `${item.name} stock is below reorder point (${item.reorderPoint})`,
            createdAt: new Date(),
          })
        }

        if (item.maxStock && item.stockQuantity > item.maxStock) {
          alerts.push({
            type: 'overstock',
            severity: 'low',
            message: `${item.name} stock exceeds maximum (${item.maxStock})`,
            createdAt: new Date(),
          })
        }

        item.alerts = alerts
      }

      return item
    }))

    // Calculate aggregate metrics if requested
    let metrics = {}
    if (validatedParams.includeMetrics) {
      const metricsResult = await query(`
        SELECT
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE ii.stock_qty > 0) as in_stock_items,
          COUNT(*) FILTER (WHERE ii.stock_qty = 0) as out_of_stock_items,
          COUNT(*) FILTER (WHERE ii.stock_qty <= ii.reorder_point AND ii.stock_qty > 0) as low_stock_items,
          COUNT(*) FILTER (WHERE ii.max_stock IS NOT NULL AND ii.stock_qty > ii.max_stock) as overstock_items,
          SUM(ii.stock_qty * ii.cost_price) as total_inventory_value,
          AVG(ii.stock_qty * ii.cost_price) as avg_item_value,
          COUNT(DISTINCT ii.category) as total_categories,
          COUNT(DISTINCT ii.brand) as total_brands,
          COUNT(DISTINCT ii.supplier_id) as total_suppliers
        FROM inventory_items ii
      `)

      if (metricsResult.rows.length > 0) {
        const row = metricsResult.rows[0]
        metrics = {
          totalItems: parseInt(row.total_items),
          inStockItems: parseInt(row.in_stock_items),
          outOfStockItems: parseInt(row.out_of_stock_items),
          lowStockItems: parseInt(row.low_stock_items),
          overstockItems: parseInt(row.overstock_items),
          totalInventoryValue: parseFloat(row.total_inventory_value || '0'),
          averageItemValue: parseFloat(row.avg_item_value || '0'),
          totalCategories: parseInt(row.total_categories),
          totalBrands: parseInt(row.total_brands),
          totalSuppliers: parseInt(row.total_suppliers),
        }
      }
    }

    const totalPages = Math.ceil(total / validatedParams.limit)

    return NextResponse.json({
      success: true,
      data: inventoryItems,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        totalPages,
        hasNext: validatedParams.page < totalPages,
        hasPrev: validatedParams.page > 1,
      },
      metrics,
      filters: validatedParams,
    })

  } catch (error) {
    console.error('Error fetching enhanced inventory:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})

/**
 * POST /api/inventory/enhanced - Create inventory item with advanced features
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateInventoryItemSchema.parse(body)

    // Check for SKU uniqueness
    const existingSku = await query('SELECT id FROM inventory_items WHERE sku = $1', [validatedData.sku])
    if (existingSku.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'SKU already exists',
        details: `An item with SKU '${validatedData.sku}' already exists`
      }, { status: 409 })
    }

    // Validate supplier if provided
    if (validatedData.supplierId) {
      const supplierCheck = await query('SELECT id FROM suppliers WHERE id = $1', [validatedData.supplierId])
      if (supplierCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Supplier not found',
          details: `Supplier with ID '${validatedData.supplierId}' does not exist`
        }, { status: 400 })
      }
    }

    // Create inventory item in transaction
    const result = await withTransaction(async (client) => {
      // Insert inventory item
      const itemResult = await client.query(`
        INSERT INTO inventory_items (
          sku, name, description, category, subcategory, brand, supplier_id, supplier_sku,
          cost_price, sale_price, currency, stock_qty, reserved_qty, available_qty,
          reorder_point, max_stock, unit, weight, dimensions, location, barcode,
          tags, images, status, tax_rate, custom_fields, notes,
          batch_tracking, serial_tracking, expiration_tracking,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          NOW(), NOW()
        ) RETURNING *
      `, [
        validatedData.sku,
        validatedData.name,
        validatedData.description,
        validatedData.category,
        validatedData.subcategory,
        validatedData.brand,
        validatedData.supplierId,
        validatedData.supplierSku,
        validatedData.costPrice,
        validatedData.salePrice,
        validatedData.currency,
        validatedData.stockQuantity,
        validatedData.reservedQuantity,
        validatedData.stockQuantity - validatedData.reservedQuantity, // available_qty
        validatedData.reorderPoint,
        validatedData.maxStock,
        validatedData.unit,
        validatedData.weight,
        JSON.stringify(validatedData.dimensions || {}),
        validatedData.location,
        validatedData.barcode,
        validatedData.tags,
        validatedData.images,
        validatedData.stockQuantity > 0 ? 'active' : 'out_of_stock',
        validatedData.taxRate,
        JSON.stringify(validatedData.customFields || {}),
        validatedData.notes,
        validatedData.batchTracking,
        validatedData.serialTracking,
        validatedData.expirationTracking,
      ])

      const newItem = itemResult.rows[0]

      // Create initial stock movement if quantity > 0
      if (validatedData.stockQuantity > 0) {
        await client.query(`
          INSERT INTO stock_movements (
            item_id, movement_type, quantity, unit_cost, reason, reference,
            location, notes, created_at, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
        `, [
          newItem.id,
          'in',
          validatedData.stockQuantity,
          validatedData.costPrice,
          'Initial stock',
          'INIT',
          validatedData.location,
          'Initial inventory creation',
          'system'
        ])
      }

      return newItem
    })

    console.log(`✅ Inventory item created: ${result.name} (${result.sku})`)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Inventory item created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating inventory item:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create inventory item',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/inventory/enhanced - Bulk update inventory items
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = BulkUpdateSchema.parse(body)

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      summary: {
        totalItems: validatedData.items.length,
        successCount: 0,
        failureCount: 0,
      }
    }

    // Process updates in transaction
    await withTransaction(async (client) => {
      for (const { id, updates } of validatedData.items) {
        try {
          // Build dynamic update query
          const updateFields: string[] = []
          const updateValues: any[] = []
          let paramIndex = 1

          for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
              const dbField = camelToSnake(key)
              updateFields.push(`${dbField} = $${paramIndex}`)

              if (['dimensions', 'custom_fields'].includes(dbField)) {
                updateValues.push(JSON.stringify(value))
              } else {
                updateValues.push(value)
              }
              paramIndex++
            }
          }

          if (updateFields.length === 0) {
            results.failed.push({ id, error: 'No valid updates provided' })
            continue
          }

          updateFields.push(`updated_at = NOW()`)

          const updateQuery = `
            UPDATE inventory_items
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
          `
          updateValues.push(id)

          const updateResult = await client.query(updateQuery, updateValues)

          if (updateResult.rows.length === 0) {
            results.failed.push({ id, error: 'Item not found' })
          } else {
            results.successful.push(updateResult.rows[0])
            results.summary.successCount++
          }

        } catch (error) {
          results.failed.push({
            id,
            error: error instanceof Error ? error.message : 'Update failed'
          })
          results.summary.failureCount++
        }
      }

      // Log bulk update
      await client.query(`
        INSERT INTO inventory_audit_log (
          action, affected_items, reason, notes, created_at, created_by
        ) VALUES ($1, $2, $3, $4, NOW(), $5)
      `, [
        'bulk_update',
        results.summary.successCount,
        validatedData.reason,
        validatedData.notes,
        'system'
      ])
    })

    return NextResponse.json({
      success: true,
      data: results,
      message: `Bulk update completed: ${results.summary.successCount} successful, ${results.summary.failureCount} failed`
    })

  } catch (error) {
    console.error('Error in bulk update:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Bulk update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/inventory/enhanced/movement - Record stock movement
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = StockMovementSchema.parse(body)

    // Verify item exists
    const itemCheck = await query('SELECT * FROM inventory_items WHERE id = $1', [validatedData.itemId])
    if (itemCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Inventory item not found'
      }, { status: 404 })
    }

    const currentItem = itemCheck.rows[0]

    // Calculate new stock levels
    let newStockQty = currentItem.stock_qty
    let newReservedQty = currentItem.reserved_qty || 0

    switch (validatedData.movementType) {
      case 'in':
        newStockQty += Math.abs(validatedData.quantity)
        break
      case 'out':
        newStockQty -= Math.abs(validatedData.quantity)
        break
      case 'adjustment':
        newStockQty = Math.abs(validatedData.quantity)
        break
      case 'transfer':
        // For transfers, quantity can be negative (out) or positive (in)
        newStockQty += validatedData.quantity
        break
    }

    // Validate stock levels
    if (newStockQty < 0) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient stock',
        details: `Cannot reduce stock below zero. Current: ${currentItem.stock_qty}, Requested: ${validatedData.quantity}`
      }, { status: 400 })
    }

    // Execute movement in transaction
    const result = await withTransaction(async (client) => {
      // Record stock movement
      const movementResult = await client.query(`
        INSERT INTO stock_movements (
          item_id, movement_type, quantity, unit_cost, reason, reference,
          location, notes, batch_number, serial_numbers, expiration_date,
          previous_qty, new_qty, created_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14
        ) RETURNING *
      `, [
        validatedData.itemId,
        validatedData.movementType,
        validatedData.quantity,
        validatedData.unitCost,
        validatedData.reason,
        validatedData.reference,
        validatedData.location,
        validatedData.notes,
        validatedData.batchNumber,
        validatedData.serialNumbers || [],
        validatedData.expirationDate,
        currentItem.stock_qty,
        newStockQty,
        'system'
      ])

      // Update inventory item
      const newAvailableQty = newStockQty - newReservedQty
      const newStatus = newStockQty === 0 ? 'out_of_stock' : 'active'

      await client.query(`
        UPDATE inventory_items
        SET stock_qty = $1, available_qty = $2, status = $3, updated_at = NOW()
        WHERE id = $4
      `, [newStockQty, newAvailableQty, newStatus, validatedData.itemId])

      return movementResult.rows[0]
    })

    return NextResponse.json({
      success: true,
      data: {
        movement: result,
        newStockLevel: newStockQty,
        newAvailableQuantity: newStockQty - newReservedQty,
      },
      message: 'Stock movement recorded successfully'
    })

  } catch (error) {
    console.error('Error recording stock movement:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to record stock movement',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}
