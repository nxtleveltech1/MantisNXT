import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
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
  ]),
  sku: z.string().optional(),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  unit_cost_zar: z.number().positive('Unit cost must be positive'),
  lead_time_days: z.number().optional(),
  minimum_order_quantity: z.number().optional(),
  supplier_id: z.string().uuid('Valid supplier ID is required'),
  barcode: z.string().optional(),
  weight_kg: z.number().optional(),
  dimensions_cm: z.string().optional(),
  shelf_life_days: z.number().optional(),
  storage_requirements: z.string().optional(),
  country_of_origin: z.string().optional(),
  brand: z.string().optional(),
  model_number: z.string().optional()
})

export async function GET() {
  try {
    const query = `
      SELECT
        p.*,
        s.name as supplier_name,
        s.status as supplier_status
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status = 'active'
      ORDER BY p.name
    `

    const result = await db.query(query)

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = productSchema.parse(body)

    // Check if supplier exists and is active
    const supplierCheck = await db.query(
      'SELECT id, status FROM suppliers WHERE id = $1',
      [validatedData.supplier_id]
    )

    if (supplierCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    if (supplierCheck.rows[0].status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Supplier is not active' },
        { status: 400 }
      )
    }

    // Check for duplicate SKU if provided
    if (validatedData.sku) {
      const skuCheck = await db.query(
        'SELECT id FROM products WHERE sku = $1 AND status = $2',
        [validatedData.sku, 'active']
      )

      if (skuCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'SKU already exists' },
          { status: 409 }
        )
      }
    }

    // Insert product
    const insertQuery = `
      INSERT INTO products (
        supplier_id, name, description, category, sku, unit_of_measure,
        unit_cost_zar, lead_time_days, minimum_order_quantity, barcode,
        weight_kg, dimensions_cm, shelf_life_days, storage_requirements,
        country_of_origin, brand, model_number, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active'
      ) RETURNING *
    `

    const insertResult = await db.query(insertQuery, [
      validatedData.supplier_id,
      validatedData.name,
      validatedData.description,
      validatedData.category,
      validatedData.sku,
      validatedData.unit_of_measure,
      validatedData.unit_cost_zar,
      validatedData.lead_time_days,
      validatedData.minimum_order_quantity,
      validatedData.barcode,
      validatedData.weight_kg,
      validatedData.dimensions_cm,
      validatedData.shelf_life_days,
      validatedData.storage_requirements,
      validatedData.country_of_origin,
      validatedData.brand,
      validatedData.model_number
    ])

    // Create initial inventory item
    const inventoryQuery = `
      INSERT INTO inventory_items (
        product_id, location, current_stock, reserved_stock, available_stock,
        reorder_point, max_stock_level, cost_per_unit_zar, total_value_zar,
        stock_status
      ) VALUES (
        $1, 'Main Warehouse', 0, 0, 0, 10, 100, $2, 0, 'out_of_stock'
      )
    `

    await db.query(inventoryQuery, [
      insertResult.rows[0].id,
      validatedData.unit_cost_zar
    ])

    return NextResponse.json({
      success: true,
      data: insertResult.rows[0],
      message: 'Product created successfully'
    })
  } catch (error) {
    console.error('Error creating product:', error)

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
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}