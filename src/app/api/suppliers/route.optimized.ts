import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/database'
import { z } from 'zod'
import { CacheInvalidator } from '@/lib/cache/invalidation'

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

// ============================================================================
// OPTIMIZATION 1: Query Result Caching
// ============================================================================
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const queryCache = new Map<string, { data: any; timestamp: number }>()

function getCacheKey(params: any): string {
  return JSON.stringify(params)
}

function getCached(key: string): any | null {
  const cached = queryCache.get(key)
  if (!cached) return null

  const age = Date.now() - cached.timestamp
  if (age > CACHE_TTL) {
    queryCache.delete(key)
    return null
  }

  return cached.data
}

function setCache(key: string, data: any): void {
  queryCache.set(key, { data, timestamp: Date.now() })

  // Limit cache size to 1000 entries
  if (queryCache.size > 1000) {
    const firstKey = queryCache.keys().next().value
    queryCache.delete(firstKey)
  }
}

// ============================================================================
// OPTIMIZATION 2: Optimized Query Builder
// ============================================================================
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Cap at 100
    const offset = (page - 1) * limit

    // Check cache first
    const cacheKey = getCacheKey({
      search, status, performanceTier, category, region, beeLevel,
      preferredOnly, minSpend, maxSpend, page, limit
    })
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // ========================================================================
    // OPTIMIZATION 3: Use optimized view with pre-calculated metrics
    // ========================================================================
    const includeMetrics = searchParams.get('includeMetrics') === 'true'

    // Build optimized query using covering indexes
    let query = `
      SELECT
        s.id,
        s.name,
        s.email,
        s.phone,
        s.contact_person,
        s.address,
        s.website,
        s.tax_id,
        s.primary_category,
        s.geographic_region,
        s.preferred_supplier,
        s.status,
        s.performance_tier,
        s.bee_level,
        s.spend_last_12_months,
        s.payment_terms,
        s.created_at,
        s.updated_at
        ${includeMetrics ? `, COUNT(i.id) as item_count, SUM(i.stock_qty * i.cost_price) as total_inventory_value` : ''}
      FROM suppliers s
      ${includeMetrics ? `LEFT JOIN inventory_items i ON s.id = i.supplier_id` : ''}
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramIndex = 1

    // ========================================================================
    // OPTIMIZATION 4: Use indexes efficiently - exact matches first
    // ========================================================================

    // Status filter - uses idx_suppliers_status
    if (status?.length) {
      if (status.length === 1) {
        query += ` AND s.status = $${paramIndex}`
        queryParams.push(status[0])
      } else {
        query += ` AND s.status = ANY($${paramIndex})`
        queryParams.push(status)
      }
      paramIndex++
    }

    // Preferred supplier filter - uses idx_suppliers_preferred
    if (preferredOnly) {
      query += ` AND s.preferred_supplier = true`
    }

    // Performance tier filter - uses idx_suppliers_performance_tier
    if (performanceTier?.length) {
      query += ` AND s.performance_tier = ANY($${paramIndex})`
      queryParams.push(performanceTier)
      paramIndex++
    }

    // Category filter - uses idx_suppliers_primary_category
    if (category?.length) {
      query += ` AND s.primary_category = ANY($${paramIndex})`
      queryParams.push(category)
      paramIndex++
    }

    // Region filter - uses idx_suppliers_geographic_region
    if (region?.length) {
      query += ` AND s.geographic_region = ANY($${paramIndex})`
      queryParams.push(region)
      paramIndex++
    }

    // BEE level filter - uses idx_suppliers_bee_level
    if (beeLevel?.length) {
      query += ` AND s.bee_level = ANY($${paramIndex})`
      queryParams.push(beeLevel)
      paramIndex++
    }

    // ========================================================================
    // OPTIMIZATION 5: Full-text search instead of multiple ILIKE
    // ========================================================================
    if (search) {
      // Use GIN index for full-text search (much faster than ILIKE)
      query += ` AND to_tsvector('english',
        s.name || ' ' ||
        COALESCE(s.email, '') || ' ' ||
        COALESCE(s.contact_person, '') || ' ' ||
        COALESCE(s.primary_category, '')
      ) @@ plainto_tsquery('english', $${paramIndex})`
      queryParams.push(search)
      paramIndex++
    }

    // Spend filters - uses idx_suppliers_spend_range
    if (minSpend) {
      query += ` AND s.spend_last_12_months >= $${paramIndex}`
      queryParams.push(parseFloat(minSpend))
      paramIndex++
    }

    if (maxSpend) {
      query += ` AND s.spend_last_12_months <= $${paramIndex}`
      queryParams.push(parseFloat(maxSpend))
      paramIndex++
    }

    // Group by if including metrics
    if (includeMetrics) {
      query += ` GROUP BY s.id`
    }

    // Add ordering - uses idx_suppliers_status_name covering index
    query += ` ORDER BY s.name ASC`

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    // ========================================================================
    // OPTIMIZATION 6: Single query for count using window function
    // This eliminates the second COUNT query entirely
    // ========================================================================
    const countOverQuery = query.replace(
      'SELECT',
      'SELECT COUNT(*) OVER() AS full_count,'
    )

    // Execute optimized query
    const startTime = Date.now()
    const result = await query(countOverQuery, queryParams)
    const queryTime = Date.now() - startTime

    // Get total from first row (window function)
    const total = result.rows.length > 0 ? parseInt(result.rows[0].full_count) : 0

    // Remove full_count from results
    const cleanedRows = result.rows.map(row => {
      const { full_count, ...cleanRow } = row
      return cleanRow
    })

    const totalPages = Math.ceil(total / limit)

    const response = {
      success: true,
      data: cleanedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      meta: {
        queryTime: `${queryTime}ms`,
        cached: false
      }
    }

    // Cache the response
    setCache(cacheKey, response)

    console.log(`✅ Suppliers query completed in ${queryTime}ms (${result.rows.length} rows)`)

    return NextResponse.json(response)

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

// ============================================================================
// OPTIMIZATION 7: Batch insert with ON CONFLICT for upserts
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support both single and batch inserts
    const suppliers = Array.isArray(body) ? body : [body]

    if (suppliers.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 suppliers per batch' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Use transaction for batch insert
    const results = []
    const errors = []
    await withTransaction(async (client) => {

      for (const supplierData of suppliers) {
        try {
          const validatedData = supplierSchema.parse(supplierData)

          // Check for duplicate - use index scan
          const existingSupplier = await client.query(
            'SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1)',
            [validatedData.name]
          )

          if (existingSupplier.rows.length > 0) {
            errors.push({
              name: validatedData.name,
              error: 'Supplier with this name already exists'
            })
            continue
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

          const insertResult = await client.query(insertQuery, [
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

          results.push(insertResult.rows[0])
        } catch (error) {
          errors.push({
            name: supplierData.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

    })

    // Invalidate cache after successful creation
    queryCache.clear()
    if (results.length > 0) {
      CacheInvalidator.invalidateSupplier(results[0].id, results[0].name)
    }

    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `${results.length} supplier(s) created successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    })

  } catch (error) {
    console.error('Error creating supplier:', error)

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
        error: 'Failed to create supplier',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// OPTIMIZATION 8: Cache invalidation endpoint
// ============================================================================
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'clear-cache') {
    queryCache.clear()
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    })
  }

  return NextResponse.json(
    { success: false, error: 'Invalid action' },
    { status: 400 }
  )
}
