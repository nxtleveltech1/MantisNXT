import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const search = searchParams.get('search')
    const category = searchParams.get('category')?.split(',')
    const supplierId = searchParams.get('supplier_id')?.split(',')
    const stockStatus = searchParams.get('stock_status')?.split(',')
    const abcClassification = searchParams.get('abc_classification')?.split(',')
    const location = searchParams.get('location')?.split(',')
    const minValue = searchParams.get('min_value')
    const maxValue = searchParams.get('max_value')
    const lowStockOnly = searchParams.get('low_stock_only') === 'true'
    const outOfStockOnly = searchParams.get('out_of_stock_only') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build the query
    let query = `
      SELECT
        i.*,
        p.name as product_name,
        p.description as product_description,
        p.category,
        p.sku,
        p.unit_of_measure,
        p.barcode,
        s.name as supplier_name,
        s.status as supplier_status
      FROM inventory_items i
      JOIN products p ON i.product_id = p.id
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramIndex = 1

    // Add search filter
    if (search) {
      query += ` AND (
        p.name ILIKE $${paramIndex} OR
        p.description ILIKE $${paramIndex} OR
        p.sku ILIKE $${paramIndex} OR
        s.name ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Add category filter
    if (category?.length) {
      query += ` AND p.category = ANY($${paramIndex})`
      queryParams.push(category)
      paramIndex++
    }

    // Add supplier filter
    if (supplierId?.length) {
      query += ` AND p.supplier_id = ANY($${paramIndex})`
      queryParams.push(supplierId)
      paramIndex++
    }

    // Add stock status filter
    if (stockStatus?.length) {
      query += ` AND i.stock_status = ANY($${paramIndex})`
      queryParams.push(stockStatus)
      paramIndex++
    }

    // Add ABC classification filter
    if (abcClassification?.length) {
      query += ` AND i.abc_classification = ANY($${paramIndex})`
      queryParams.push(abcClassification)
      paramIndex++
    }

    // Add location filter
    if (location?.length) {
      query += ` AND i.location = ANY($${paramIndex})`
      queryParams.push(location)
      paramIndex++
    }

    // Add value range filters
    if (minValue) {
      query += ` AND i.total_value_zar >= $${paramIndex}`
      queryParams.push(parseFloat(minValue))
      paramIndex++
    }

    if (maxValue) {
      query += ` AND i.total_value_zar <= $${paramIndex}`
      queryParams.push(parseFloat(maxValue))
      paramIndex++
    }

    // Add low stock filter
    if (lowStockOnly) {
      query += ` AND i.current_stock <= i.reorder_point`
    }

    // Add out of stock filter
    if (outOfStockOnly) {
      query += ` AND i.current_stock = 0`
    }

    // Add ordering and pagination
    query += ` ORDER BY i.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    // Execute query
    const result = await db.query(query, queryParams)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM inventory_items i
      JOIN products p ON i.product_id = p.id
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `

    // Apply same filters to count query (excluding pagination)
    const countParams = queryParams.slice(0, -2) // Remove limit and offset
    let countParamIndex = 1

    if (search) {
      countQuery += ` AND (
        p.name ILIKE $${countParamIndex} OR
        p.description ILIKE $${countParamIndex} OR
        p.sku ILIKE $${countParamIndex} OR
        s.name ILIKE $${countParamIndex}
      )`
      countParamIndex++
    }

    if (category?.length) {
      countQuery += ` AND p.category = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (supplierId?.length) {
      countQuery += ` AND p.supplier_id = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (stockStatus?.length) {
      countQuery += ` AND i.stock_status = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (abcClassification?.length) {
      countQuery += ` AND i.abc_classification = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (location?.length) {
      countQuery += ` AND i.location = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (minValue) {
      countQuery += ` AND i.total_value_zar >= $${countParamIndex}`
      countParamIndex++
    }

    if (maxValue) {
      countQuery += ` AND i.total_value_zar <= $${countParamIndex}`
      countParamIndex++
    }

    if (lowStockOnly) {
      countQuery += ` AND i.current_stock <= i.reorder_point`
    }

    if (outOfStockOnly) {
      countQuery += ` AND i.current_stock = 0`
    }

    const countResult = await db.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)

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
      }
    })
  } catch (error) {
    console.error('Error fetching inventory items:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}