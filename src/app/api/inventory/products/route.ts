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

    console.log(`🔍 Fetching products: limit=${limit}, offset=${offset}`);

    // Get products from core.supplier_product table with proper schema
    const query = `
      SELECT
        sp.supplier_product_id::text as id,
        sp.supplier_sku as sku,
        sp.name_from_supplier as name,
        '' as description,
        '' as category,
        '' as brand,
        COALESCE(ph.price, 0) as price,
        COALESCE(ph.price, 0) as sale_price,
        COALESCE(soh.qty, 0) as stock,
        10 as reorder_point,
        CASE WHEN sp.is_active THEN 'active' ELSE 'inactive' END as status,
        sp.uom as unit,
        s.name as supplier_name,
        sp.created_at,
        sp.updated_at
      FROM core.supplier_product sp
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN LATERAL (
        SELECT price FROM core.price_history
        WHERE supplier_product_id = sp.supplier_product_id
          AND is_current = true
        LIMIT 1
      ) ph ON true
      LEFT JOIN LATERAL (
        SELECT qty FROM core.stock_on_hand
        WHERE supplier_product_id = sp.supplier_product_id
        ORDER BY as_of_ts DESC
        LIMIT 1
      ) soh ON true
      WHERE sp.is_active = true
      ORDER BY sp.name_from_supplier ASC
      LIMIT $1 OFFSET $2
    `

    const countQuery = `
      SELECT COUNT(*) as total
      FROM core.supplier_product
      WHERE is_active = true
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

    console.log(`📦 Creating new product: ${validatedData.name}`);

    // Check if supplier exists and is active - using core.supplier
    const supplierCheck = await pool.query(
      'SELECT supplier_id, active FROM core.supplier WHERE supplier_id = $1',
      [validatedData.supplier_id]
    )

    if (supplierCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    if (!supplierCheck.rows[0].active) {
      return NextResponse.json(
        { success: false, error: 'Supplier is not active' },
        { status: 400 }
      )
    }

    // Check for duplicate SKU if provided - using core.supplier_product
    if (validatedData.sku) {
      const skuCheck = await pool.query(
        'SELECT supplier_product_id FROM core.supplier_product WHERE supplier_id = $1 AND supplier_sku = $2 AND is_active = true',
        [validatedData.supplier_id, validatedData.sku]
      )

      if (skuCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'SKU already exists for this supplier' },
          { status: 409 }
        )
      }
    }

    // Insert product into core.supplier_product
    const insertQuery = `
      INSERT INTO core.supplier_product (
        supplier_id, supplier_sku, name_from_supplier, uom,
        pack_size, barcode, is_new, is_active, first_seen_at, last_seen_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, true, true, NOW(), NOW()
      ) RETURNING supplier_product_id, supplier_sku, name_from_supplier, created_at, updated_at
    `

    const insertResult = await pool.query(insertQuery, [
      validatedData.supplier_id,
      validatedData.sku || `PROD-${Date.now()}`,
      validatedData.name,
      validatedData.unit_of_measure,
      validatedData.minimum_order_quantity?.toString(),
      validatedData.barcode
    ])

    const product = insertResult.rows[0];

    // Insert initial price into core.price_history
    const priceQuery = `
      INSERT INTO core.price_history (
        supplier_product_id, price, currency, valid_from, is_current
      ) VALUES (
        $1, $2, $3, NOW(), true
      )
    `

    await pool.query(priceQuery, [
      product.supplier_product_id,
      validatedData.unit_cost_zar,
      'ZAR'
    ])

    console.log(`✅ Product created: ${product.supplier_product_id}`);

    return NextResponse.json({
      success: true,
      data: {
        id: product.supplier_product_id,
        sku: product.supplier_sku,
        name: product.name_from_supplier,
        created_at: product.created_at,
        updated_at: product.updated_at
      },
      message: 'Product created successfully'
    })
  } catch (error) {
    console.error('Error creating product:', error)

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
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}