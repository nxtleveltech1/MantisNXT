import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'
import { z } from 'zod'
import { CacheInvalidator } from '@/lib/cache/invalidation'

const purchaseOrderSchema = z.object({
  supplier_id: z.string().uuid('Valid supplier ID is required'),
  po_number: z.string().min(1, 'PO number is required'),
  status: z.enum(['draft', 'pending_approval', 'approved', 'sent', 'acknowledged', 'in_progress', 'shipped', 'received', 'completed', 'cancelled']).optional(),
  order_date: z.string().optional(),
  required_date: z.string().optional(),
  subtotal: z.number().positive('Subtotal must be positive'),
  tax_amount: z.number().min(0, 'Tax amount must be non-negative'),
  total_amount: z.number().positive('Total amount must be positive'),
  currency: z.string().default('ZAR'),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const search = searchParams.get('search')
    const status = searchParams.get('status')?.split(',')
    const supplierId = searchParams.get('supplier_id')?.split(',')
    const minAmount = searchParams.get('min_amount')
    const maxAmount = searchParams.get('max_amount')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build the main query with joins to get supplier names
    let query = `
      SELECT
        po.*,
        s.name as supplier_name,
        s.supplier_code,
        s.status as supplier_status
      FROM purchase_orders po
      LEFT JOIN public.suppliers s ON po.supplier_id = s.id
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramIndex = 1

    // Add search filter
    if (search) {
      query += ` AND (
        po.po_number ILIKE $${paramIndex} OR
        po.notes ILIKE $${paramIndex} OR
        s.name ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Add status filter
    if (status?.length) {
      query += ` AND po.status = ANY($${paramIndex})`
      queryParams.push(status)
      paramIndex++
    }

    // Add supplier filter
    if (supplierId?.length) {
      query += ` AND po.supplier_id = ANY($${paramIndex})`
      queryParams.push(supplierId)
      paramIndex++
    }

    // Add amount range filters
    if (minAmount) {
      query += ` AND po.total_amount >= $${paramIndex}`
      queryParams.push(parseFloat(minAmount))
      paramIndex++
    }

    if (maxAmount) {
      query += ` AND po.total_amount <= $${paramIndex}`
      queryParams.push(parseFloat(maxAmount))
      paramIndex++
    }

    // Add ordering and pagination
    query += ` ORDER BY po.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    // Execute query
    const result = await pool.query(query, queryParams)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM purchase_orders po
      LEFT JOIN public.suppliers s ON po.supplier_id = s.id
      WHERE 1=1
    `

    // Apply same filters to count query (excluding pagination)
    const countParams = queryParams.slice(0, -2) // Remove limit and offset
    let countParamIndex = 1

    if (search) {
      countQuery += ` AND (
        po.po_number ILIKE $${countParamIndex} OR
        po.notes ILIKE $${countParamIndex} OR
        s.name ILIKE $${countParamIndex}
      )`
      countParamIndex++
    }

    if (status?.length) {
      countQuery += ` AND po.status = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (supplierId?.length) {
      countQuery += ` AND po.supplier_id = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (minAmount) {
      countQuery += ` AND po.total_amount >= $${countParamIndex}`
      countParamIndex++
    }

    if (maxAmount) {
      countQuery += ` AND po.total_amount <= $${countParamIndex}`
      countParamIndex++
    }

    const countResult = await pool.query(countQuery, countParams)
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
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch purchase orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = purchaseOrderSchema.parse(body)

    // Check if supplier exists and is active
    const supplierCheck = await pool.query(
      'SELECT id, status FROM public.suppliers WHERE id = $1',
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

    // Check for duplicate PO number
    const poCheck = await pool.query(
      'SELECT id FROM purchase_orders WHERE po_number = $1',
      [validatedData.po_number]
    )

    if (poCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'PO number already exists' },
        { status: 409 }
      )
    }

    // Insert purchase order using actual schema
    const insertQuery = `
      INSERT INTO purchase_orders (
        supplier_id, po_number, status, order_date, required_date,
        subtotal, tax_amount, total_amount, currency, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `

    const insertResult = await pool.query(insertQuery, [
      validatedData.supplier_id,
      validatedData.po_number,
      validatedData.status || 'draft',
      validatedData.order_date || new Date().toISOString().split('T')[0],
      validatedData.required_date,
      validatedData.subtotal,
      validatedData.tax_amount,
      validatedData.total_amount,
      validatedData.currency,
      validatedData.notes
    ])

    // Invalidate cache after successful creation
    CacheInvalidator.invalidatePurchaseOrder(insertResult.rows[0].id, validatedData.supplier_id)

    return NextResponse.json({
      success: true,
      data: insertResult.rows[0],
      message: 'Purchase order created successfully'
    })
  } catch (error) {
    console.error('Error creating purchase order:', error)

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
        error: 'Failed to create purchase order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No purchase order IDs provided' },
        { status: 400 }
      )
    }

    // Soft delete purchase orders by updating status
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',')
    const deleteQuery = `
      UPDATE purchase_orders
      SET status = 'cancelled', updated_at = NOW()
      WHERE id IN (${placeholders})
      RETURNING id
    `

    const result = await pool.query(deleteQuery, ids)

    // Invalidate cache for each cancelled PO
    result.rows.forEach(row => {
      CacheInvalidator.invalidatePurchaseOrder(row.id)
    })

    return NextResponse.json({
      success: true,
      message: `${result.rows.length} purchase order(s) cancelled successfully`
    })
  } catch (error) {
    console.error('Error deleting purchase orders:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete purchase orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
