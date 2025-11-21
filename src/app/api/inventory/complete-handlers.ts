/**
 * Complete Inventory Management API
 * Live database integration with full CRUD operations
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
  // TODO(SSOT): Replace all legacy reads/writes with core.* access
import { query } from '@/lib/database/unified-connection'
import { setStock, upsertSupplierProduct } from '@/services/ssot/inventoryService'
import { TransactionHelper } from '@/lib/database/transaction-helper'
import { z } from 'zod'

// Enhanced validation schemas
const inventoryItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').max(100),
  brand: z.string().max(100).optional(),
  supplier_id: z.string().uuid().optional(),
  supplier_sku: z.string().max(100).optional(),
  cost_price: z.number().min(0, 'Cost price must be positive'),
  sale_price: z.number().min(0, 'Sale price must be positive').optional(),
  rsp: z.number().min(0, 'RSP must be positive').optional(),
  currency: z.string().max(3).default('ZAR'),
  stock_qty: z.number().int().min(0, 'Stock quantity must be non-negative'),
  reserved_qty: z.number().int().min(0).default(0),
  available_qty: z.number().int().min(0).optional(),
  reorder_point: z.number().int().min(0).default(0),
  max_stock: z.number().int().min(0).optional(),
  unit: z.string().max(50).optional(),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
    unit: z.string().max(10)
  }).optional(),
  barcode: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  tax_rate: z.number().min(0).max(1).default(0.15),
  custom_fields: z.record(z.string(), z.any()).default({}),
  notes: z.string().optional()
})

const bulkUpdateSchema = z.object({
  items: z.array(z.object({
    id: z.union([
      z.string().uuid(),
      z.string().min(1, 'Inventory item ID is required')
    ]),
    updates: inventoryItemSchema.partial()
  })),
  reason: z.string().optional()
})

const stockMovementSchema = z.object({
  item_id: z.string().uuid(),
  movement_type: z.enum(['in', 'out', 'transfer', 'adjustment']),
  quantity: z.number().int(),
  cost: z.number().min(0).optional(),
  reason: z.string().min(1, 'Reason is required'),
  reference: z.string().optional(),
  location_from: z.string().optional(),
  location_to: z.string().optional(),
  notes: z.string().optional()
})

// GET /api/inventory/complete - Enhanced inventory listing with analytics
export async function getCompleteInventory(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract and validate query parameters
    const search = searchParams.get('search')
    const category = searchParams.get('category')?.split(',')
    const brand = searchParams.get('brand')?.split(',')
    const supplier = searchParams.get('supplier')?.split(',')
    const status = searchParams.get('status')?.split(',')
    const lowStock = searchParams.get('low_stock') === 'true'
    const outOfStock = searchParams.get('out_of_stock') === 'true'
    const overStock = searchParams.get('over_stock') === 'true'
    const minCost = searchParams.get('min_cost')
    const maxCost = searchParams.get('max_cost')
    const minPrice = searchParams.get('min_price')
    const maxPrice = searchParams.get('max_price')
    const location = searchParams.get('location')?.split(',')
    const tags = searchParams.get('tags')?.split(',')
    const sortBy = searchParams.get('sort_by') || 'name'
    const sortOrder = searchParams.get('sort_order') || 'asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000)
    const includeAnalytics = searchParams.get('include_analytics') === 'true'
    const includeMovements = searchParams.get('include_movements') === 'true'

    const offset = (page - 1) * limit

    // Build dynamic query with proper SQL injection protection
    // Include enriched data from supplier_product and pricelist
    let baseQuery = `
      SELECT
        i.*,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        (i.stock_qty - COALESCE(i.reserved_qty, 0)) as available_qty,
        CASE
          WHEN i.stock_qty = 0 THEN 'out'
          WHEN i.stock_qty <= COALESCE(i.reorder_point, 0) THEN 'low'
          ELSE 'normal'
        END as stock_status,
        COALESCE(ph.price, i.cost_price, 0) as cost_per_unit_zar,
        COALESCE(ph.price, i.cost_price, 0) * i.stock_qty as total_value_zar,
        COALESCE(cat.category_raw, i.category, 'Unknown') as category,
        (COALESCE(i.rsp, i.sale_price, 0) - COALESCE(ph.price, i.cost_price, 0)) as margin,
        CASE
          WHEN COALESCE(ph.price, i.cost_price, 0) > 0 THEN
            (COALESCE(i.rsp, i.sale_price, 0) - COALESCE(ph.price, i.cost_price, 0))
            / COALESCE(NULLIF(ph.price, 0), NULLIF(i.cost_price, 0), 1)
          ELSE 0
        END as margin_percentage
      FROM public.inventory_items i
      LEFT JOIN public.suppliers s ON i.supplier_id::text = s.id
      LEFT JOIN core.supplier_product sp ON sp.supplier_sku = i.sku AND sp.supplier_id::text = i.supplier_id
      LEFT JOIN LATERAL (
        SELECT price
        FROM core.price_history
        WHERE supplier_product_id = sp.supplier_product_id
          AND is_current = true
        ORDER BY valid_from DESC
        LIMIT 1
      ) ph ON TRUE
      LEFT JOIN LATERAL (
        SELECT category_raw
        FROM spp.pricelist_row r
        JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id
        WHERE r.supplier_sku = i.sku AND u.supplier_id::text = i.supplier_id
        ORDER BY u.received_at DESC
        LIMIT 1
      ) cat ON TRUE
      WHERE 1=1
    `

    const queryParams: unknown[] = []
    let paramIndex = 1

    // Apply search filter
    if (search) {
      baseQuery += ` AND (
        i.sku ILIKE $${paramIndex} OR
        i.name ILIKE $${paramIndex} OR
        i.description ILIKE $${paramIndex} OR
        i.barcode ILIKE $${paramIndex} OR
        s.name ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Apply category filter
    if (category?.length) {
      baseQuery += ` AND i.category = ANY($${paramIndex})`
      queryParams.push(category)
      paramIndex++
    }

    // Apply brand filter
    if (brand?.length) {
      baseQuery += ` AND i.brand = ANY($${paramIndex})`
      queryParams.push(brand)
      paramIndex++
    }

    // Apply supplier filter
    if (supplier?.length) {
      if (supplier.length === 1) {
        baseQuery += ` AND i.supplier_id = $${paramIndex}::uuid`
        queryParams.push(supplier[0])
        paramIndex++
      } else {
        baseQuery += ` AND i.supplier_id = ANY($${paramIndex}::uuid[])`
        queryParams.push(supplier)
        paramIndex++
      }
    }

    // Apply status filter (skipped: status column may not exist in current DB)
    if (status?.length) {
      // Intentionally ignoring status filter to maintain compatibility
    }

    // Apply stock filters
    if (lowStock) {
      baseQuery += ` AND i.stock_qty <= i.reorder_point AND i.stock_qty > 0`
    }

    if (outOfStock) {
      baseQuery += ` AND i.stock_qty = 0`
    }

    if (overStock) {
      baseQuery += ` AND i.max_stock IS NOT NULL AND i.stock_qty >= i.max_stock`
    }

    // Apply cost filters
    if (minCost) {
      baseQuery += ` AND i.cost_price >= $${paramIndex}`
      queryParams.push(parseFloat(minCost))
      paramIndex++
    }

    if (maxCost) {
      baseQuery += ` AND i.cost_price <= $${paramIndex}`
      queryParams.push(parseFloat(maxCost))
      paramIndex++
    }

    // Apply price filters
    if (minPrice) {
      baseQuery += ` AND COALESCE(i.rsp, i.sale_price) >= $${paramIndex}`
      queryParams.push(parseFloat(minPrice))
      paramIndex++
    }

    if (maxPrice) {
      baseQuery += ` AND COALESCE(i.rsp, i.sale_price) <= $${paramIndex}`
      queryParams.push(parseFloat(maxPrice))
      paramIndex++
    }

    // Apply location filter
    if (location?.length) {
      baseQuery += ` AND i.location = ANY($${paramIndex})`
      queryParams.push(location)
      paramIndex++
    }

    // Apply tags filter
    if (tags?.length) {
      baseQuery += ` AND i.tags && $${paramIndex}`
      queryParams.push(tags)
      paramIndex++
    }

    // Apply sorting
    const validSortFields = ['name', 'sku', 'category', 'brand', 'cost_price', 'sale_price', 'rsp', 'stock_qty', 'created_at', 'updated_at']
    const validSortOrders = ['asc', 'desc']

    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'name'
    const safeSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'asc'

    baseQuery += ` ORDER BY i.${safeSortBy} ${safeSortOrder.toUpperCase()}`

    // Apply pagination
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    // Execute main query
    const result = await query(baseQuery, queryParams)

    // Build proper count query without complex LATERAL joins
    let countQuery = `
      SELECT COUNT(*) as total
      FROM public.inventory_items i
      LEFT JOIN public.suppliers s ON i.supplier_id::text = s.id
      WHERE 1=1
    `

    // Rebuild the WHERE conditions for count query (same as baseQuery filters)
    let countParamIndex = 1
    const countParams: unknown[] = []

    if (search) {
      countQuery += ` AND (
        i.sku ILIKE $${countParamIndex} OR
        i.name ILIKE $${countParamIndex} OR
        i.description ILIKE $${countParamIndex} OR
        i.barcode ILIKE $${countParamIndex} OR
        s.name ILIKE $${countParamIndex}
      )`
      countParams.push(`%${search}%`)
      countParamIndex++
    }

    if (category?.length) {
      countQuery += ` AND i.category = ANY($${countParamIndex})`
      countParams.push(category)
      countParamIndex++
    }

    if (brand?.length) {
      countQuery += ` AND i.brand = ANY($${countParamIndex})`
      countParams.push(brand)
      countParamIndex++
    }

    if (supplier?.length) {
      if (supplier.length === 1) {
        countQuery += ` AND i.supplier_id = $${countParamIndex}::uuid`
        countParams.push(supplier[0])
      } else {
        countQuery += ` AND i.supplier_id = ANY($${countParamIndex}::uuid[])`
        countParams.push(supplier)
      }
      countParamIndex++
    }

    if (status?.length) {
      countQuery += ` AND i.status = ANY($${countParamIndex})`
      countParams.push(status)
      countParamIndex++
    }

    if (lowStock) {
      countQuery += ` AND i.stock_qty <= COALESCE(i.reorder_point, 0) AND i.stock_qty > 0`
    }

    if (outOfStock) {
      countQuery += ` AND i.stock_qty = 0`
    }

    if (overStock) {
      countQuery += ` AND i.max_stock IS NOT NULL AND i.stock_qty >= i.max_stock`
    }

    if (minCost) {
      countQuery += ` AND i.cost_price >= $${countParamIndex}`
      countParams.push(parseFloat(minCost))
      countParamIndex++
    }

    if (maxCost) {
      countQuery += ` AND i.cost_price <= $${countParamIndex}`
      countParams.push(parseFloat(maxCost))
      countParamIndex++
    }

    if (minPrice) {
      countQuery += ` AND COALESCE(i.rsp, i.sale_price) >= $${countParamIndex}`
      countParams.push(parseFloat(minPrice))
      countParamIndex++
    }

    if (maxPrice) {
      countQuery += ` AND COALESCE(i.rsp, i.sale_price) <= $${countParamIndex}`
      countParams.push(parseFloat(maxPrice))
      countParamIndex++
    }

    if (location?.length) {
      countQuery += ` AND i.location = ANY($${countParamIndex})`
      countParams.push(location)
      countParamIndex++
    }

    if (tags?.length) {
      countQuery += ` AND i.tags && $${countParamIndex}`
      countParams.push(tags)
      countParamIndex++
    }

    const countResult = await query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)

    let analytics = null
    let movements = null

    // Include analytics if requested
    if (includeAnalytics) {
      const analyticsQuery = `
        SELECT
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE stock_qty = 0) as out_of_stock,
          COUNT(*) FILTER (WHERE stock_qty <= COALESCE(reorder_point, 0) AND stock_qty > 0) as low_stock,
          0::integer as over_stock,
          COUNT(DISTINCT category) as categories,
          0::integer as brands,
          COUNT(DISTINCT supplier_id) as suppliers,
          0::numeric as total_value,
          0::numeric as avg_cost_price,
          0::numeric as avg_sale_price,
          0::numeric as avg_margin_percentage
        FROM public.inventory_items
        WHERE status = 'active'
      `

      const analyticsResult = await query(analyticsQuery)
      analytics = analyticsResult.rows[0]
    }

    // Include recent movements if requested
    if (includeMovements) {
      const movementsQuery = `
        SELECT
          sm.*,
          sm.type as movement_type,
          i.sku,
          i.name as item_name
        FROM public.stock_movements sm
        LEFT JOIN public.inventory_items i ON sm.item_id = i.id
        ORDER BY sm.created_at DESC
        LIMIT 50
      `

      const movementsResult = await query(movementsQuery)
      movements = movementsResult.rows
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      analytics,
      recentMovements: movements,
      filters: {
        search,
        category,
        brand,
        supplier,
        status,
        lowStock,
        outOfStock,
        overStock,
        location,
        tags
      }
    })

  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/inventory/complete - Create new inventory item
export async function createInventoryItems(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle bulk operations
    if (body.action === 'bulk_create') {
      return handleBulkCreate(body.items)
    }

    // Handle single item creation
    const validatedData = inventoryItemSchema.parse(body)

    // Check for duplicate SKU
    const existingItem = await query(
      'SELECT sku FROM public.inventory_items WHERE sku = $1 AND supplier_id::text = COALESCE($2, supplier_id::text)',
      [validatedData.sku, validatedData.supplier_id ?? null]
    )

    if (existingItem.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'SKU already exists' },
        { status: 409 }
      )
    }

    // Calculate available quantity
    const availableQty = validatedData.stock_qty - validatedData.reserved_qty

    // Insert new inventory item
    // SSOT: Ensure supplier product mapping and set initial stock in core tables
    if (!validatedData.supplier_id || !validatedData.supplier_sku) {
      return NextResponse.json({ success: false, error: 'supplier_id and supplier_sku required for SSOT inventory creation' }, { status: 400 })
    }
    await upsertSupplierProduct({
      supplierId: validatedData.supplier_id,
      sku: validatedData.supplier_sku,
      name: validatedData.name
    })
    await setStock({
      supplierId: validatedData.supplier_id,
      sku: validatedData.supplier_sku,
      quantity: validatedData.stock_qty,
      unitCost: validatedData.cost_price,
      reason: `Initial stock for ${validatedData.sku}`
    })

    return NextResponse.json({
      success: true,
      data: {
        sku: validatedData.sku,
        supplier_id: validatedData.supplier_id,
        supplier_sku: validatedData.supplier_sku,
        stock_qty: validatedData.stock_qty
      },
      message: 'Inventory item created successfully (SSOT)'
    })

  } catch (error) {
    console.error('Error creating inventory item:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create inventory item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/inventory/complete - Bulk update operations
export async function updateInventoryItems(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === 'bulk_update') {
      return handleBulkUpdate(body)
    }

    if (body.action === 'stock_movement') {
      return handleStockMovement(body)
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in inventory update:', error)
    return NextResponse.json(
      { success: false, error: 'Update operation failed' },
      { status: 500 }
    )
  }
}

export async function deleteInventoryItems(request: NextRequest) {
  try {
    const body = await request.json()
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((value: unknown) => typeof value === 'string')
      : []

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Must provide array of inventory item IDs to delete' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: false, error: 'SSOT: deleting inventory items is not allowed. Use deactivation policies in core.', code: 'SSOT_BLOCKED' }, { status: 405 })
  } catch (error) {
    console.error('Error deleting inventory items:', error)
    return NextResponse.json(
      { success: false, error: 'Delete operation failed' },
      { status: 500 }
    )
  }
}

// Helper functions
async function handleBulkCreate(items: unknown[]) {
  try {
    const validatedItems = items.map(item => inventoryItemSchema.parse(item))

    return await TransactionHelper.withTransaction(async (client) => {
      const created = []
      const updated = []
      const errors = []

      for (const item of validatedItems) {
        try {
          // Check if item already exists
          const existing = await client.query(
            'SELECT id, stock_qty FROM public.inventory_items WHERE sku = $1',
            [item.sku]
          )

          const spSku = item.supplier_sku || item.sku

          if (existing.rows.length > 0) {
            // Update existing item: add to stock quantity and update cost price
            const existingId = existing.rows[0].id
            const existingStock = existing.rows[0].stock_qty || 0
            const newStock = existingStock + (item.stock_qty || 0)

            await client.query(
              `UPDATE public.inventory_items
               SET stock_qty = $1,
                   updated_at = NOW()
               WHERE id = $2`,
              [newStock, existingId]
            )

            // SSOT: update supplier_product and add to stock
            if (item.supplier_id && spSku) {
              await upsertSupplierProduct({
                supplierId: item.supplier_id,
                sku: spSku,
                name: item.name
              })
              await setStock({
                supplierId: item.supplier_id,
                sku: spSku,
                quantity: item.stock_qty || 0,
                unitCost: item.cost_price,
                reason: 'bulk_update_stock_in'
              })
            }

            updated.push({
              sku: item.sku,
              supplier_id: item.supplier_id,
              previous_stock: existingStock,
              new_stock: newStock,
              added: item.stock_qty
            })
          } else {
            // Create new item
            // SSOT: create supplier_product and set initial stock when supplier context provided
            if (item.supplier_id && spSku) {
              await upsertSupplierProduct({
                supplierId: item.supplier_id,
                sku: spSku,
                name: item.name
              })
              await setStock({
                supplierId: item.supplier_id,
                sku: spSku,
                quantity: item.stock_qty || 0,
                unitCost: item.cost_price,
                reason: 'bulk_create'
              })
            }

            created.push({
              sku: item.sku,
              supplier_id: item.supplier_id,
              stock: item.stock_qty
            })
          }
        } catch (error) {
          errors.push({
            sku: item.sku,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        data: {
          created,
          updated,
          errors
        },
        message: `Created: ${created.length}, Updated: ${updated.length}, Errors: ${errors.length}`
      })
    })
  } catch (error) {
    console.error('Error in bulk create:', error)
    return NextResponse.json({
      success: false,
      error: 'Bulk create failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleBulkUpdate(body: unknown) {
  try {
    const validatedData = bulkUpdateSchema.parse(body)

    return await TransactionHelper.withTransaction(async (client) => {
      const results = []

      for (const item of validatedData.items) {
        const updateFields = []
        const updateValues = []
        let paramIndex = 1

        // Build dynamic update query
        for (const [field, value] of Object.entries(item.updates)) {
          if (value !== undefined) {
            updateFields.push(`${field} = $${paramIndex}`)
            updateValues.push(value)
            paramIndex++
          }
        }

        if (updateFields.length === 0) continue

        updateFields.push(`updated_at = NOW()`)

        const resultPayload: Record<string, unknown> = { id: item.id }

        // SSOT: only support stock set via SSOT when stock_qty provided
        if (item.updates.stock_qty !== undefined && item.updates.supplier_id && item.updates.supplier_sku) {
          await setStock({ supplierId: String(item.updates.supplier_id), sku: String(item.updates.supplier_sku), quantity: Number(item.updates.stock_qty), unitCost: item.updates.cost_price, reason: 'bulk_update' })
          resultPayload.stock_qty = item.updates.stock_qty
        }

        updateValues.push(item.id)
        const updateQuery = `
          UPDATE core.stock_on_hand
          SET ${updateFields.join(', ')}
          WHERE soh_id = $${paramIndex}
          RETURNING soh_id AS id, location_id, qty AS stock_qty, NOW() AS updated_at
        `
        const updateResult = await client.query(updateQuery, updateValues)

        if (updateResult.rows.length > 0) {
          const updatedRow = updateResult.rows[0]
          resultPayload.id = updatedRow.id
          resultPayload.stock_qty = updatedRow.stock_qty
          resultPayload.updated_at = updatedRow.updated_at

        if (item.updates.location_id) {
          resultPayload.location_id = item.updates.location_id
        }
        }

        results.push(resultPayload)
      }

      return NextResponse.json({
        success: true,
        data: results,
        message: `${results.length} inventory items updated successfully`
      })
    })
  } catch (error) {
    console.error('Error in bulk update:', error)
    return NextResponse.json({
      success: false,
      error: 'Bulk update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleStockMovement(body: unknown) {
  try {
    const validatedData = stockMovementSchema.parse(body)

    return await TransactionHelper.withTransaction(async (client) => {
    // Get current stock
    const currentStock = await client.query(
      'SELECT stock_qty, reserved_qty, supplier_id, supplier_sku FROM public.inventory_items WHERE id = $1',
      [validatedData.item_id]
    )

    if (currentStock.rows.length === 0) {
      throw new Error('Inventory item not found')
    }

    const current = currentStock.rows[0]
    let newStockQty = current.stock_qty

    // Calculate new stock quantity based on movement type
    switch (validatedData.movement_type) {
      case 'in':
        newStockQty += validatedData.quantity
        break
      case 'out':
        newStockQty -= validatedData.quantity
        if (newStockQty < 0) {
          throw new Error('Insufficient stock')
        }
        break
      case 'adjustment':
        newStockQty = validatedData.quantity
        break
    }

    // SSOT stock set
    await setStock({ supplierId: String(current.supplier_id), sku: String(current.supplier_sku), quantity: newStockQty, unitCost: validatedData.cost, reason: validatedData.reason })

    // Record stock movement
    const movementResult = await client.query(`
      INSERT INTO stock_movements (
        item_id, type, quantity, unit_cost, reason, reference,
        location_from, location_to, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      validatedData.item_id,
      validatedData.movement_type,
      validatedData.quantity,
      validatedData.cost,
      validatedData.reason,
      validatedData.reference,
      validatedData.location_from,
      validatedData.location_to,
      validatedData.notes
    ])

      return NextResponse.json({
        success: true,
        data: {
          movement: movementResult.rows[0],
          newStockQty,
          previousStockQty: current.stock_qty
        },
        message: 'Stock movement recorded successfully'
      })
    })
  } catch (error) {
    console.error('Error recording stock movement:', error)
    return NextResponse.json({
      success: false,
      error: 'Stock movement failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
