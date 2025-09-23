import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  website: z.string().url().optional(),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  primary_category: z.string().optional(),
  geographic_region: z.string().optional(),
  preferred_supplier: z.boolean().default(false),
  bee_level: z.string().optional(),
  local_content_percentage: z.number().min(0).max(100).optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const search = searchParams.get('search')
    const status = searchParams.get('status')?.split(',')
    const performanceTier = searchParams.get('performance_tier')?.split(',')
    const category = searchParams.get('category')?.split(',')
    const region = searchParams.get('region')?.split(',')
    const beeLevel = searchParams.get('bee_level')?.split(',')
    const preferredOnly = searchParams.get('preferred_only') === 'true'
    const minSpend = searchParams.get('min_spend')
    const maxSpend = searchParams.get('max_spend')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build the query
    let query = `
      SELECT *
      FROM suppliers
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramIndex = 1

    // Add search filter
    if (search) {
      query += ` AND (
        name ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        contact_person ILIKE $${paramIndex} OR
        primary_category ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Add status filter
    if (status?.length) {
      query += ` AND status = ANY($${paramIndex})`
      queryParams.push(status)
      paramIndex++
    }

    // Add performance tier filter
    if (performanceTier?.length) {
      query += ` AND performance_tier = ANY($${paramIndex})`
      queryParams.push(performanceTier)
      paramIndex++
    }

    // Add category filter
    if (category?.length) {
      query += ` AND primary_category = ANY($${paramIndex})`
      queryParams.push(category)
      paramIndex++
    }

    // Add region filter
    if (region?.length) {
      query += ` AND geographic_region = ANY($${paramIndex})`
      queryParams.push(region)
      paramIndex++
    }

    // Add BEE level filter
    if (beeLevel?.length) {
      query += ` AND bee_level = ANY($${paramIndex})`
      queryParams.push(beeLevel)
      paramIndex++
    }

    // Add preferred supplier filter
    if (preferredOnly) {
      query += ` AND preferred_supplier = true`
    }

    // Add spend filters
    if (minSpend) {
      query += ` AND spend_last_12_months >= $${paramIndex}`
      queryParams.push(parseFloat(minSpend))
      paramIndex++
    }

    if (maxSpend) {
      query += ` AND spend_last_12_months <= $${paramIndex}`
      queryParams.push(parseFloat(maxSpend))
      paramIndex++
    }

    // Add ordering and pagination
    query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    // Execute query
    const result = await db.query(query, queryParams)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM suppliers
      WHERE 1=1
    `

    // Apply same filters to count query (excluding pagination)
    const countParams = queryParams.slice(0, -2) // Remove limit and offset
    let countParamIndex = 1

    if (search) {
      countQuery += ` AND (
        name ILIKE $${countParamIndex} OR
        email ILIKE $${countParamIndex} OR
        contact_person ILIKE $${countParamIndex} OR
        primary_category ILIKE $${countParamIndex}
      )`
      countParamIndex++
    }

    if (status?.length) {
      countQuery += ` AND status = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (performanceTier?.length) {
      countQuery += ` AND performance_tier = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (category?.length) {
      countQuery += ` AND primary_category = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (region?.length) {
      countQuery += ` AND geographic_region = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (beeLevel?.length) {
      countQuery += ` AND bee_level = ANY($${countParamIndex})`
      countParamIndex++
    }

    if (preferredOnly) {
      countQuery += ` AND preferred_supplier = true`
    }

    if (minSpend) {
      countQuery += ` AND spend_last_12_months >= $${countParamIndex}`
      countParamIndex++
    }

    if (maxSpend) {
      countQuery += ` AND spend_last_12_months <= $${countParamIndex}`
      countParamIndex++
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
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch suppliers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = supplierSchema.parse(body)

    // Check for duplicate supplier name
    const existingSupplier = await db.query(
      'SELECT id FROM suppliers WHERE name = $1',
      [validatedData.name]
    )

    if (existingSupplier.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier with this name already exists' },
        { status: 409 }
      )
    }

    // Insert supplier
    const insertQuery = `
      INSERT INTO suppliers (
        name, email, phone, address, contact_person, website, tax_id,
        payment_terms, primary_category, geographic_region, preferred_supplier,
        bee_level, local_content_percentage, status, performance_tier
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', 'unrated'
      ) RETURNING *
    `

    const insertResult = await db.query(insertQuery, [
      validatedData.name,
      validatedData.email,
      validatedData.phone,
      validatedData.address,
      validatedData.contact_person,
      validatedData.website,
      validatedData.tax_id,
      validatedData.payment_terms,
      validatedData.primary_category,
      validatedData.geographic_region,
      validatedData.preferred_supplier,
      validatedData.bee_level,
      validatedData.local_content_percentage
    ])

    return NextResponse.json({
      success: true,
      data: insertResult.rows[0],
      message: 'Supplier created successfully'
    })
  } catch (error) {
    console.error('Error creating supplier:', error)

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
        error: 'Failed to create supplier',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}