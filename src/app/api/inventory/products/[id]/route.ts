import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum([
    'raw_materials',
    'components',
    'finished_goods',
    'consumables',
    'services',
    'packaging',
    'tools',
    'safety_equipment'
  ]).optional(),
  sku: z.string().optional(),
  unit_of_measure: z.string().min(1).optional(),
  unit_cost_zar: z.number().positive().optional(),
  lead_time_days: z.number().optional(),
  minimum_order_quantity: z.number().optional(),
  barcode: z.string().optional(),
  weight_kg: z.number().optional(),
  dimensions_cm: z.string().optional(),
  shelf_life_days: z.number().optional(),
  storage_requirements: z.string().optional(),
  country_of_origin: z.string().optional(),
  brand: z.string().optional(),
  model_number: z.string().optional()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const validatedData = updateProductSchema.parse(body)

    // Check if product exists
    const productCheck = await db.query(
      'SELECT id FROM products WHERE id = $1 AND status = $2',
      [id, 'active']
    )

    if (productCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check for duplicate SKU if provided and different from current
    if (validatedData.sku) {
      const skuCheck = await db.query(
        'SELECT id FROM products WHERE sku = $1 AND id != $2 AND status = $3',
        [validatedData.sku, id, 'active']
      )

      if (skuCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'SKU already exists' },
          { status: 409 }
        )
      }
    }

    // Build update query dynamically
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`)
        updateValues.push(value)
        paramIndex++
      }
    })

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const updateQuery = `
      UPDATE products
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await db.query(updateQuery, updateValues)

    // Update inventory item cost if unit cost changed
    if (validatedData.unit_cost_zar) {
      await db.query(
        'UPDATE inventory_items SET cost_per_unit_zar = $1, total_value_zar = current_stock * $1 WHERE product_id = $2',
        [validatedData.unit_cost_zar, id]
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Product updated successfully'
    })
  } catch (error) {
    console.error('Error updating product:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if product exists
    const productCheck = await db.query(
      'SELECT id FROM products WHERE id = $1 AND status = $2',
      [id, 'active']
    )

    if (productCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if product has active inventory
    const inventoryCheck = await db.query(
      'SELECT id FROM inventory_items WHERE product_id = $1 AND current_stock > 0',
      [id]
    )

    if (inventoryCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete product with active inventory. Please adjust stock to zero first.'
        },
        { status: 400 }
      )
    }

    // Soft delete - mark as discontinued
    await db.query(
      'UPDATE products SET status = $1, updated_at = NOW() WHERE id = $2',
      ['discontinued', id]
    )

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}