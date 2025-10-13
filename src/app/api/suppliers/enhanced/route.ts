import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { query, withTransaction } from '@/lib/database'

// ============================================================================
// ENHANCED SUPPLIERS API - REAL DATABASE INTEGRATION
// Comprehensive supplier management with advanced features
// ============================================================================

// Validation schemas
const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  contact: z.object({
    primaryName: z.string().optional(),
    primaryEmail: z.string().email().optional(),
    primaryPhone: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
  businessInfo: z.object({
    taxId: z.string().optional(),
    registrationNumber: z.string().optional(),
    industry: z.string().optional(),
    companySize: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
    yearEstablished: z.number().min(1800).max(new Date().getFullYear()).optional(),
  }).optional(),
  paymentTerms: z.object({
    paymentMethod: z.enum(['cash', 'credit', 'bank_transfer', 'check']).default('credit'),
    creditLimit: z.number().min(0).optional(),
    paymentDays: z.number().min(0).default(30),
    earlyPaymentDiscount: z.number().min(0).max(100).optional(),
  }).optional(),
  capabilities: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  isPreferred: z.boolean().default(false),
  minimumOrderValue: z.number().min(0).optional(),
  leadTimeDays: z.number().min(0).optional(),
})

const UpdateSupplierSchema = CreateSupplierSchema.partial()

const SearchSuppliersSchema = z.object({
  query: z.string().optional(),
  status: z.array(z.enum(['active', 'inactive', 'pending', 'suspended'])).optional(),
  categories: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isPreferred: z.boolean().optional(),
  country: z.string().optional(),
  paymentMethod: z.string().optional(),
  minCreditLimit: z.number().optional(),
  maxCreditLimit: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'created_at', 'updated_at', 'status', 'total_orders', 'rating']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeMetrics: z.boolean().default(false),
  includeProducts: z.boolean().default(false),
})

/**
 * GET /api/suppliers/enhanced - Advanced supplier listing with comprehensive filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryParams = {
      query: searchParams.get('query') || undefined,
      status: searchParams.get('status')?.split(',') as any || undefined,
      categories: searchParams.get('categories')?.split(',') || undefined,
      capabilities: searchParams.get('capabilities')?.split(',') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      isPreferred: searchParams.get('isPreferred') === 'true' || undefined,
      country: searchParams.get('country') || undefined,
      paymentMethod: searchParams.get('paymentMethod') || undefined,
      minCreditLimit: searchParams.get('minCreditLimit') ? parseFloat(searchParams.get('minCreditLimit')!) : undefined,
      maxCreditLimit: searchParams.get('maxCreditLimit') ? parseFloat(searchParams.get('maxCreditLimit')!) : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') as any || 'name',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'asc',
      includeMetrics: searchParams.get('includeMetrics') === 'true',
      includeProducts: searchParams.get('includeProducts') === 'true',
    }

    const validatedParams = SearchSuppliersSchema.parse(queryParams)

    // Build dynamic query
    let baseQuery = `
      SELECT
        s.*,
        COUNT(DISTINCT ii.id) as product_count,
        COUNT(DISTINCT po.id) as total_orders,
        AVG(sr.rating)::numeric(3,2) as avg_rating,
        SUM(po.total_amount) as total_order_value,
        MAX(po.created_at) as last_order_date
      FROM suppliers s
      LEFT JOIN inventory_items ii ON s.id = ii.supplier_id
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      LEFT JOIN supplier_ratings sr ON s.id = sr.supplier_id
      WHERE 1=1
    `

    const queryValues: any[] = []
    let paramIndex = 1

    // Apply filters
    if (validatedParams.query) {
      baseQuery += ` AND (
        s.name ILIKE $${paramIndex} OR
        s.code ILIKE $${paramIndex} OR
        s.description ILIKE $${paramIndex} OR
        s.email ILIKE $${paramIndex} OR
        $${paramIndex} = ANY(s.categories) OR
        $${paramIndex} = ANY(s.capabilities) OR
        $${paramIndex} = ANY(s.tags)
      )`
      queryValues.push(`%${validatedParams.query}%`)
      paramIndex++
    }

    if (validatedParams.status && validatedParams.status.length > 0) {
      baseQuery += ` AND s.status = ANY($${paramIndex})`
      queryValues.push(validatedParams.status)
      paramIndex++
    }

    if (validatedParams.categories && validatedParams.categories.length > 0) {
      baseQuery += ` AND s.categories && $${paramIndex}`
      queryValues.push(validatedParams.categories)
      paramIndex++
    }

    if (validatedParams.capabilities && validatedParams.capabilities.length > 0) {
      baseQuery += ` AND s.capabilities && $${paramIndex}`
      queryValues.push(validatedParams.capabilities)
      paramIndex++
    }

    if (validatedParams.tags && validatedParams.tags.length > 0) {
      baseQuery += ` AND s.tags && $${paramIndex}`
      queryValues.push(validatedParams.tags)
      paramIndex++
    }

    if (validatedParams.isPreferred !== undefined) {
      baseQuery += ` AND s.is_preferred = $${paramIndex}`
      queryValues.push(validatedParams.isPreferred)
      paramIndex++
    }

    if (validatedParams.country) {
      baseQuery += ` AND s.address->>'country' ILIKE $${paramIndex}`
      queryValues.push(`%${validatedParams.country}%`)
      paramIndex++
    }

    if (validatedParams.paymentMethod) {
      baseQuery += ` AND s.payment_terms->>'paymentMethod' = $${paramIndex}`
      queryValues.push(validatedParams.paymentMethod)
      paramIndex++
    }

    if (validatedParams.minCreditLimit !== undefined) {
      baseQuery += ` AND (s.payment_terms->>'creditLimit')::numeric >= $${paramIndex}`
      queryValues.push(validatedParams.minCreditLimit)
      paramIndex++
    }

    if (validatedParams.maxCreditLimit !== undefined) {
      baseQuery += ` AND (s.payment_terms->>'creditLimit')::numeric <= $${paramIndex}`
      queryValues.push(validatedParams.maxCreditLimit)
      paramIndex++
    }

    // Add grouping
    baseQuery += ` GROUP BY s.id`

    // Add sorting
    let orderBy = ' ORDER BY '
    switch (validatedParams.sortBy) {
      case 'name':
        orderBy += 's.name'
        break
      case 'created_at':
        orderBy += 's.created_at'
        break
      case 'updated_at':
        orderBy += 's.updated_at'
        break
      case 'status':
        orderBy += 's.status'
        break
      case 'total_orders':
        orderBy += 'COUNT(DISTINCT po.id)'
        break
      case 'rating':
        orderBy += 'AVG(sr.rating)'
        break
      default:
        orderBy += 's.name'
    }
    orderBy += ` ${validatedParams.sortOrder === 'desc' ? 'DESC' : 'ASC'}`

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM suppliers s
      LEFT JOIN inventory_items ii ON s.id = ii.supplier_id
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      LEFT JOIN supplier_ratings sr ON s.id = sr.supplier_id
      WHERE 1=1
      ${baseQuery.split('WHERE 1=1')[1]?.split('GROUP BY')[0] || ''}
    `
    const countResult = await query(countQuery, queryValues)
    const total = parseInt(countResult.rows[0]?.total || '0')

    // Add pagination
    const offset = (validatedParams.page - 1) * validatedParams.limit
    const finalQuery = baseQuery + orderBy + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryValues.push(validatedParams.limit, offset)

    // Execute main query
    const result = await query(finalQuery, queryValues)

    // Transform results
    const suppliers = await Promise.all(result.rows.map(async (row: any) => {
      const supplierData = {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        email: row.email,
        phone: row.phone,
        website: row.website,
        address: row.address || {},
        contact: row.contact || {},
        businessInfo: row.business_info || {},
        paymentTerms: row.payment_terms || {},
        capabilities: row.capabilities || [],
        categories: row.categories || [],
        tags: row.tags || [],
        notes: row.notes,
        status: row.status,
        isPreferred: row.is_preferred,
        minimumOrderValue: row.minimum_order_value,
        leadTimeDays: row.lead_time_days,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Aggregated metrics
        productCount: parseInt(row.product_count) || 0,
        totalOrders: parseInt(row.total_orders) || 0,
        averageRating: parseFloat(row.avg_rating) || 0,
        totalOrderValue: parseFloat(row.total_order_value) || 0,
        lastOrderDate: row.last_order_date,
      }

      // Add detailed metrics if requested
      if (validatedParams.includeMetrics) {
        const metricsResult = await query(`
          SELECT
            COUNT(DISTINCT ii.id) as active_products,
            COUNT(DISTINCT ii.id) FILTER (WHERE ii.stock_qty <= ii.reorder_point) as low_stock_products,
            COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'pending') as pending_orders,
            COUNT(DISTINCT po.id) FILTER (WHERE po.created_at > NOW() - INTERVAL '30 days') as recent_orders,
            AVG(CASE WHEN po.delivered_at IS NOT NULL AND po.expected_delivery IS NOT NULL
                THEN EXTRACT(EPOCH FROM po.delivered_at - po.expected_delivery) / 86400
                ELSE NULL END) as avg_delivery_variance_days
          FROM suppliers s
          LEFT JOIN inventory_items ii ON s.id = ii.supplier_id
          LEFT JOIN purchase_orders po ON s.id = po.supplier_id
          WHERE s.id = $1
          GROUP BY s.id
        `, [row.id])

        if (metricsResult.rows.length > 0) {
          const metrics = metricsResult.rows[0]
          supplierData.metrics = {
            activeProducts: parseInt(metrics.active_products) || 0,
            lowStockProducts: parseInt(metrics.low_stock_products) || 0,
            pendingOrders: parseInt(metrics.pending_orders) || 0,
            recentOrders: parseInt(metrics.recent_orders) || 0,
            averageDeliveryVariance: parseFloat(metrics.avg_delivery_variance_days) || 0,
          }
        }
      }

      // Add recent products if requested
      if (validatedParams.includeProducts) {
        const productsResult = await query(`
          SELECT id, sku, name, category, cost_price, stock_qty, updated_at
          FROM inventory_items
          WHERE supplier_id = $1
          ORDER BY updated_at DESC
          LIMIT 10
        `, [row.id])

        supplierData.recentProducts = productsResult.rows
      }

      return supplierData
    }))

    const totalPages = Math.ceil(total / validatedParams.limit)

    return NextResponse.json({
      success: true,
      data: suppliers,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        totalPages,
        hasNext: validatedParams.page < totalPages,
        hasPrev: validatedParams.page > 1,
      },
      filters: validatedParams,
    })

  } catch (error) {
    console.error('Error fetching enhanced suppliers:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch suppliers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/suppliers/enhanced - Create new supplier with comprehensive data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateSupplierSchema.parse(body)

    // Check if supplier name already exists
    const existingSupplier = await query(
      'SELECT id FROM suppliers WHERE name = $1',
      [validatedData.name]
    )

    if (existingSupplier.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Supplier already exists',
        details: `A supplier with the name '${validatedData.name}' already exists`
      }, { status: 409 })
    }

    // Generate supplier code if not provided
    const supplierCode = validatedData.code || await generateSupplierCode(validatedData.name)

    // Create supplier in transaction
    const result = await withTransaction(async (client) => {
      // Insert main supplier record
      const supplierResult = await client.query(`
        INSERT INTO suppliers (
          name, code, description, email, phone, website, address, contact,
          business_info, payment_terms, capabilities, categories, tags, notes,
          status, is_preferred, minimum_order_value, lead_time_days,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
          NOW(), NOW()
        ) RETURNING *
      `, [
        validatedData.name,
        supplierCode,
        validatedData.description,
        validatedData.email,
        validatedData.phone,
        validatedData.website,
        JSON.stringify(validatedData.address || {}),
        JSON.stringify(validatedData.contact || {}),
        JSON.stringify(validatedData.businessInfo || {}),
        JSON.stringify(validatedData.paymentTerms || {}),
        validatedData.capabilities,
        validatedData.categories,
        validatedData.tags,
        validatedData.notes,
        'active', // Default status
        validatedData.isPreferred,
        validatedData.minimumOrderValue,
        validatedData.leadTimeDays,
      ])

      const supplier = supplierResult.rows[0]

      // Create initial supplier performance record
      await client.query(`
        INSERT INTO supplier_performance (
          supplier_id, performance_score, delivery_rating, quality_rating,
          price_rating, service_rating, created_at, updated_at
        ) VALUES ($1, 0, 0, 0, 0, 0, NOW(), NOW())
      `, [supplier.id])

      // Log supplier creation
      await client.query(`
        INSERT INTO supplier_audit_log (
          supplier_id, action, details, created_by, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        supplier.id,
        'created',
        JSON.stringify({ name: supplier.name, code: supplier.code }),
        'system' // Would be actual user ID in production
      ])

      return supplier
    })

    const transformedSupplier = {
      id: result.id,
      name: result.name,
      code: result.code,
      description: result.description,
      email: result.email,
      phone: result.phone,
      website: result.website,
      address: result.address || {},
      contact: result.contact || {},
      businessInfo: result.business_info || {},
      paymentTerms: result.payment_terms || {},
      capabilities: result.capabilities || [],
      categories: result.categories || [],
      tags: result.tags || [],
      notes: result.notes,
      status: result.status,
      isPreferred: result.is_preferred,
      minimumOrderValue: result.minimum_order_value,
      leadTimeDays: result.lead_time_days,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    }

    console.log(`✅ Supplier created successfully: ${result.name} (${result.code})`)

    return NextResponse.json({
      success: true,
      data: transformedSupplier,
      message: 'Supplier created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating supplier:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create supplier',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/suppliers/enhanced - Update supplier information
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Supplier ID is required'
      }, { status: 400 })
    }

    const validatedData = UpdateSupplierSchema.parse(updateData)

    // Check if supplier exists
    const existingSupplier = await query('SELECT * FROM suppliers WHERE id = $1', [id])
    if (existingSupplier.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Supplier not found'
      }, { status: 404 })
    }

    const current = existingSupplier.rows[0]

    // Build update query dynamically
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined) {
        const dbField = camelToSnake(key)

        if (['address', 'contact', 'business_info', 'payment_terms'].includes(dbField)) {
          updateFields.push(`${dbField} = $${paramIndex}`)
          updateValues.push(JSON.stringify(value))
        } else {
          updateFields.push(`${dbField} = $${paramIndex}`)
          updateValues.push(value)
        }
        paramIndex++
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update'
      }, { status: 400 })
    }

    // Add updated_at
    updateFields.push(`updated_at = NOW()`)

    // Execute update in transaction
    const result = await withTransaction(async (client) => {
      const updateQuery = `
        UPDATE suppliers
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `
      updateValues.push(id)

      const updateResult = await client.query(updateQuery, updateValues)

      // Log the update
      await client.query(`
        INSERT INTO supplier_audit_log (
          supplier_id, action, details, previous_values, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        id,
        'updated',
        JSON.stringify(validatedData),
        JSON.stringify(current),
        'system' // Would be actual user ID in production
      ])

      return updateResult.rows[0]
    })

    console.log(`✅ Supplier updated successfully: ${result.name}`)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Supplier updated successfully'
    })

  } catch (error) {
    console.error('Error updating supplier:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update supplier',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions

async function generateSupplierCode(name: string): Promise<string> {
  // Create base code from name
  const baseCode = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6)
    .padEnd(3, 'X')

  // Check for uniqueness and append number if needed
  let code = baseCode
  let counter = 1

  while (true) {
    const existing = await query('SELECT id FROM suppliers WHERE code = $1', [code])
    if (existing.rows.length === 0) {
      return code
    }

    code = `${baseCode}${counter.toString().padStart(2, '0')}`
    counter++

    if (counter > 99) {
      // Fallback to timestamp-based code
      return `SUP${Date.now().toString().slice(-6)}`
    }
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}
