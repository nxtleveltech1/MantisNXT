import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get products from products table (actual uploaded data)
    const query = `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.description,
        p.category,
        p.brand,
        p.cost_price as price,
        p.retail_price as sale_price,
        0 as stock,
        COALESCE(p.minimum_stock, 10) as reorder_point,
        p.status,
        p.unit_of_measure as unit,
        COALESCE(s.name, 'Unknown') as supplier_name,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status = 'active'
      ORDER BY p.name ASC
      LIMIT $1 OFFSET $2
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM products
      WHERE status = 'active'
    `

    const [productsResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ])

    const products = productsResult.rows.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      category: row.category,
      brand: row.brand,
      price: parseFloat(row.price),
      salePrice: parseFloat(row.sale_price || row.price),
      stock: row.stock,
      reorderPoint: row.reorder_point,
      status: row.status,
      unit: row.unit,
      supplier: row.supplier_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    const total = parseInt(countResult.rows[0].total)

    console.log('Products API Response:', {
      success: true,
      dataLength: products.length,
      total,
      limit,
      offset
    })

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
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
    const supplierCheck = await pool.query(
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
      const skuCheck = await pool.query(
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
        supplier_id, name, description, category, sku, cost_price,
        retail_price, currency, status, unit_of_measure, minimum_stock,
        brand, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *
    `

    const insertResult = await pool.query(insertQuery, [
      validatedData.supplier_id,
      validatedData.name,
      validatedData.description,
      validatedData.category,
      validatedData.sku || `PROD-${Date.now()}`,
      validatedData.unit_cost_zar,
      validatedData.unit_cost_zar * 1.2, // 20% markup for retail price
      'ZAR',
      'active',
      validatedData.unit_of_measure,
      validatedData.minimum_order_quantity || 10,
      validatedData.brand
    ])

    // Create initial inventory item in inventory_items table
    const inventoryQuery = `
      INSERT INTO inventory_items (
        sku, name, description, category, cost_price, stock_qty,
        reserved_qty, reorder_point, status, location
      ) VALUES (
        $1, $2, $3, $4, $5, 0, 0, 10, 'active', 'Main Warehouse'
      )
    `

    await pool.query(inventoryQuery, [
      validatedData.sku || `PROD-${Date.now()}`,
      validatedData.name,
      validatedData.description,
      validatedData.category,
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