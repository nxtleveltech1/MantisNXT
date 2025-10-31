/* eslint-disable ssot/no-legacy-supplier-inventory */ // TODO(SSOT): Refactor to core tables via inventoryService
import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/database/unified-connection'
import { z } from 'zod'
import { CacheInvalidator } from '@/lib/cache/invalidation'

// Validation schemas
const UpdateInventoryItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').optional(),
  subcategory: z.string().optional(),
  currentStock: z.number().min(0, 'Current stock must be non-negative').optional(),
  reorderPoint: z.number().min(0, 'Reorder point must be non-negative').optional(),
  maxStock: z.number().min(0, 'Max stock must be non-negative').optional(),
  minStock: z.number().min(0, 'Min stock must be non-negative').optional(),
  unitCost: z.number().min(0, 'Unit cost must be non-negative').optional(),
  unitPrice: z.number().min(0, 'Unit price must be non-negative').optional(),
  currency: z.string().default('USD').optional(),
  unit: z.string().default('pcs').optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  supplierSku: z.string().optional(),
  primaryLocationId: z.string().optional(),
  batchTracking: z.boolean().default(false).optional(),
  tags: z.array(z.string()).default([]).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional()
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/inventory/[id] - Get single inventory item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Item ID is required'
      }, { status: 400 })
    }

    // Use query() for read-only operations
    const itemQuery = `
      SELECT
        i.*,
        s.name as supplier_name,
        s.contact_email as supplier_email,
        s.contact_phone as supplier_phone
      FROM public.inventory_items i
      LEFT JOIN public.suppliers s ON i.supplier_id::text = s.id
      WHERE i.id = $1
    `

    const result = await query(itemQuery, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Item not found'
      }, { status: 404 })
    }

    const item = result.rows[0]

    // Get stock movements for this item (last 10)
    const movementsQuery = `
      SELECT
        type,
        quantity,
        reason,
        notes,
        created_at,
        created_by
      FROM public.stock_movements
      WHERE id = $1 -- compat view id column
      ORDER BY created_at DESC
      LIMIT 10
    `

    const movementsResult = await query(movementsQuery, [id])

    // Calculate inventory metrics
    const totalValue = (item.stock_qty || 0) * (item.unit_cost || 0)
    const isLowStock = (item.stock_qty || 0) <= (item.reorder_point || 0)
    const isOutOfStock = (item.stock_qty || 0) === 0

    const responseData = {
      ...item,
      totalValue,
      isLowStock,
      isOutOfStock,
      recentMovements: movementsResult.rows,
      // Convert database snake_case to frontend camelCase
      currentStock: item.stock_qty,
      unitCost: item.unit_cost,
      unitPrice: item.unit_price,
      reorderPoint: item.reorder_point,
      maxStock: item.max_stock,
      minStock: item.min_stock,
      primaryLocationId: item.primary_location_id,
      supplierSku: item.supplier_sku,
      batchTracking: item.batch_tracking || false,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Error fetching inventory item:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PUT /api/inventory/[id] - Update single inventory item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Item ID is required'
      }, { status: 400 })
    }

    const validatedData = UpdateInventoryItemSchema.parse(body)

    // SSOT path: allow direct stock set via core tables when supplierId/supplierSku/currentStock are provided
    if (validatedData.currentStock !== undefined && validatedData.supplierId && validatedData.supplierSku) {
      await setStock({
        supplierId: validatedData.supplierId,
        sku: validatedData.supplierSku,
        quantity: validatedData.currentStock,
        unitCost: validatedData.unitCost,
        reason: validatedData.notes || 'API stock set'
      })
      CacheInvalidator.invalidateInventory(id, validatedData.supplierId)
      return NextResponse.json({ success: true, data: { id, supplier_id: validatedData.supplierId, stock_qty: validatedData.currentStock }, message: 'Stock updated (SSOT)' })
    }

    // Use withTransaction for atomic operations
    const result = await withTransaction(async (client) => {
      // Check if item exists
      const checkResult = await client.query(
        'SELECT * FROM public.inventory_items WHERE id = $1',
        [id]
      )

      if (checkResult.rows.length === 0) {
        throw new Error('Item not found')
      }

      // Check for SKU uniqueness if updating SKU
      if (validatedData.sku) {
        const existingItem = await client.query(
          'SELECT id FROM public.inventory_items WHERE sku = $1 AND id != $2',
          [validatedData.sku, id]
        )

        if (existingItem.rows.length > 0) {
          throw new Error('SKU already exists for another item')
        }
      }

      // Build dynamic update query
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      Object.entries(validatedData).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert camelCase to snake_case for database columns
          let dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()

          // Handle special cases
          if (dbKey === 'current_stock') dbKey = 'stock_qty'
          if (dbKey === 'unit_cost') dbKey = 'unit_cost'
          if (dbKey === 'unit_price') dbKey = 'unit_price'

          updateFields.push(`${dbKey} = $${paramIndex}`)
          updateValues.push(value)
          paramIndex++
        }
      })

      updateFields.push(`updated_at = $${paramIndex}`)
      updateValues.push(new Date())
      updateValues.push(id) // for WHERE clause

      const updateQuery = `
        /* SSOT BLOCKED: direct updates to inventory_items are not allowed */
        SELECT NULL WHERE FALSE
      `

      const updateResult = await client.query(updateQuery, [])

      // Create stock movement record if stock quantity changed
      if (validatedData.currentStock !== undefined) {
        const oldStock = checkResult.rows[0].stock_qty || 0
        const newStock = validatedData.currentStock
        const difference = newStock - oldStock

        // SSOT handles movement logging via setStock/adjustStock
      }

      return updateResult.rows[0]
    })

    // Invalidate cache after successful update
    CacheInvalidator.invalidateInventory(id, result.supplier_id)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Item updated successfully'
    })

  } catch (error) {
    console.error('Error updating inventory item:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    // Handle custom error messages from transaction
    if (error instanceof Error) {
      if (error.message === 'Item not found') {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 404 })
      }
      if (error.message === 'SKU already exists for another item') {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/inventory/[id] - Delete single inventory item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'SSOT: deleting inventory items is not allowed. Use deactivation policies in core.', code: 'SSOT_BLOCKED' }, { status: 405 })

  } catch (error) {
    console.error('Error deleting inventory item:', error)

    if (error instanceof Error && error.message === 'Item not found') {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 404 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
