import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/database'
import { z } from 'zod'

// Validation schemas
const CreatePricelistSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  name: z.string().min(1, 'Pricelist name is required'),
  description: z.string().optional(),
  effectiveFrom: z.string().min(1, 'Effective date is required'),
  effectiveTo: z.string().optional(),
  currency: z.string().default('USD'),
  items: z.array(z.object({
    sku: z.string().min(1, 'SKU is required'),
    supplierSku: z.string().optional(),
    unitPrice: z.number().min(0, 'Unit price must be non-negative'),
    minimumQuantity: z.number().min(1, 'Minimum quantity must be positive').optional(),
    maximumQuantity: z.number().optional(),
    leadTimeDays: z.number().min(0).optional(),
    notes: z.string().optional()
  })).min(1, 'At least one item is required'),
  isActive: z.boolean().default(true),
  version: z.string().optional(),
  replaceExisting: z.boolean().default(false)
})

const UpdatePricelistSchema = CreatePricelistSchema.partial().extend({
  id: z.string().min(1, 'Pricelist ID is required')
})

const SearchPricelistsSchema = z.object({
  supplierId: z.string().optional(),
  isActive: z.boolean().optional(),
  effectiveDate: z.string().optional(),
  currency: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'effectiveFrom', 'itemCount', 'lastUpdated']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Database query helpers
async function getPricelistsFromDB(params: any) {
  let query = `
    SELECT
      p.id,
      p.supplier_id as "supplierId",
      s.name as "supplierName",
      p.name,
      p.description,
      p.effective_from as "effectiveFrom",
      p.effective_to as "effectiveTo",
      p.currency,
      p.is_active as "isActive",
      p.version,
      p.created_at as "createdAt",
      p.updated_at as "lastUpdated",
      p.created_by as "createdBy",
      p.approval_status as "approvalStatus",
      p.approved_by as "approvedBy",
      p.approved_at as "approvedAt",
      COUNT(pi.id) as "itemCount",
      COALESCE(SUM(pi.unit_price), 0) as "totalValue",
      COALESCE(AVG(pi.unit_price), 0) as "averagePrice"
    FROM supplier_pricelists p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN pricelist_items pi ON p.id = pi.pricelist_id
    WHERE 1=1
  `

  const queryParams: any[] = []
  let paramIndex = 1

  if (params.supplierId) {
    query += ` AND p.supplier_id = $${paramIndex}`
    queryParams.push(params.supplierId)
    paramIndex++
  }

  if (params.isActive !== undefined) {
    query += ` AND p.is_active = $${paramIndex}`
    queryParams.push(params.isActive)
    paramIndex++
  }

  if (params.effectiveDate) {
    query += ` AND p.effective_from <= $${paramIndex} AND (p.effective_to IS NULL OR p.effective_to >= $${paramIndex})`
    queryParams.push(params.effectiveDate)
    paramIndex++
  }

  if (params.currency) {
    query += ` AND p.currency = $${paramIndex}`
    queryParams.push(params.currency)
    paramIndex++
  }

  query += ` GROUP BY p.id, s.name`

  // Add sorting
  const sortField = params.sortBy === 'name' ? 'p.name' :
                   params.sortBy === 'effectiveFrom' ? 'p.effective_from' :
                   params.sortBy === 'itemCount' ? 'COUNT(pi.id)' :
                   'p.updated_at'

  query += ` ORDER BY ${sortField} ${params.sortOrder.toUpperCase()}`

  // Add pagination
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  queryParams.push(params.limit, (params.page - 1) * params.limit)

  const result = await query(query, queryParams)
  return result.rows
}

async function getPricelistItemsFromDB(pricelistId: string) {
  const query = `
    SELECT
      id,
      sku,
      supplier_sku as "supplierSku",
      unit_price as "unitPrice",
      minimum_quantity as "minimumQuantity",
      maximum_quantity as "maximumQuantity",
      lead_time_days as "leadTimeDays",
      notes
    FROM pricelist_items
    WHERE pricelist_id = $1
    ORDER BY sku
  `

  const result = await query(query, [pricelistId])
  return result.rows
}

async function createPricelistInDB(data: any) {
  return await withTransaction(async (client) => {

    // Insert pricelist
    const pricelistQuery = `
      INSERT INTO supplier_pricelists (
        supplier_id, name, description, effective_from, effective_to,
        currency, is_active, version, created_by, approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *
    `

    const pricelistResult = await client.query(pricelistQuery, [
      data.supplierId,
      data.name,
      data.description || '',
      data.effectiveFrom,
      data.effectiveTo || null,
      data.currency,
      data.isActive,
      data.version || '1.0',
      'api_user@company.com'
    ])

    const pricelist = pricelistResult.rows[0]

    // Insert pricelist items
    const itemQueries = data.items.map((item: any, index: number) => {
      const itemQuery = `
        INSERT INTO pricelist_items (
          pricelist_id, sku, supplier_sku, unit_price, minimum_quantity,
          maximum_quantity, lead_time_days, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `

      return client.query(itemQuery, [
        pricelist.id,
        item.sku,
        item.supplierSku || null,
        item.unitPrice,
        item.minimumQuantity || 1,
        item.maximumQuantity || null,
        item.leadTimeDays || 7,
        item.notes || null
      ])
    })

    await Promise.all(itemQueries)

    return pricelist
  })
}

// GET /api/suppliers/pricelists - List pricelists with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const queryParams = {
      supplierId: searchParams.get('supplierId') || undefined,
      isActive: searchParams.get('isActive') === 'true' || undefined,
      effectiveDate: searchParams.get('effectiveDate') || undefined,
      currency: searchParams.get('currency') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    }

    const validatedParams = SearchPricelistsSchema.parse(queryParams)

    // Get pricelists from database
    const pricelists = await getPricelistsFromDB(validatedParams)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM supplier_pricelists p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `

    const countParams: any[] = []
    let paramIndex = 1

    if (validatedParams.supplierId) {
      countQuery += ` AND p.supplier_id = $${paramIndex}`
      countParams.push(validatedParams.supplierId)
      paramIndex++
    }

    if (validatedParams.isActive !== undefined) {
      countQuery += ` AND p.is_active = $${paramIndex}`
      countParams.push(validatedParams.isActive)
      paramIndex++
    }

    if (validatedParams.effectiveDate) {
      countQuery += ` AND p.effective_from <= $${paramIndex} AND (p.effective_to IS NULL OR p.effective_to >= $${paramIndex})`
      countParams.push(validatedParams.effectiveDate)
      paramIndex++
    }

    if (validatedParams.currency) {
      countQuery += ` AND p.currency = $${paramIndex}`
      countParams.push(validatedParams.currency)
      paramIndex++
    }

    const countResult = await query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(total / validatedParams.limit)

    // Get items for each pricelist if requested
    const pricelistsWithItems = await Promise.all(
      pricelists.map(async (pricelist) => {
        const items = await getPricelistItemsFromDB(pricelist.id)
        return {
          ...pricelist,
          items,
          analytics: {
            utilizationRate: 0, // Would be calculated from purchase orders
            averageOrderValue: 0,
            topItemBySku: items[0]?.sku || '',
            priceVariance: 0,
            lastOrderDate: null
          }
        }
      })
    )

    // Calculate metrics from database
    const metricsQuery = `
      SELECT
        COUNT(DISTINCT p.id) as total_pricelists,
        COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) as active_pricelists,
        COUNT(pi.id) as total_items,
        COALESCE(SUM(pi.unit_price), 0) as total_value,
        COALESCE(AVG(pi.unit_price), 0) as average_price,
        json_object_agg(p.currency, currency_count) as currency_distribution
      FROM supplier_pricelists p
      LEFT JOIN pricelist_items pi ON p.id = pi.pricelist_id
      LEFT JOIN (
        SELECT currency, COUNT(*) as currency_count
        FROM supplier_pricelists
        GROUP BY currency
      ) currency_stats ON p.currency = currency_stats.currency
    `

    const metricsResult = await query(metricsQuery)
    const metrics = metricsResult.rows[0] || {
      total_pricelists: 0,
      active_pricelists: 0,
      total_items: 0,
      total_value: 0,
      average_price: 0,
      currency_distribution: {}
    }

    return NextResponse.json({
      success: true,
      data: pricelistsWithItems,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        totalPages,
        hasNext: validatedParams.page < totalPages,
        hasPrev: validatedParams.page > 1
      },
      metrics: {
        totalPricelists: parseInt(metrics.total_pricelists),
        activePricelists: parseInt(metrics.active_pricelists),
        totalItems: parseInt(metrics.total_items),
        totalValue: parseFloat(metrics.total_value),
        averageItemsPerPricelist: parseInt(metrics.total_pricelists) > 0 ?
          parseInt(metrics.total_items) / parseInt(metrics.total_pricelists) : 0,
        currencyDistribution: metrics.currency_distribution || {}
      },
      filters: validatedParams
    })

  } catch (error) {
    console.error('Error fetching pricelists:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/suppliers/pricelists - Create new pricelist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreatePricelistSchema.parse(body)

    // Validate supplier exists
    const supplierCheck = await pool.query(
      'SELECT id, name FROM suppliers WHERE id = $1',
      [validatedData.supplierId]
    )

    if (supplierCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Supplier not found'
      }, { status: 404 })
    }

    const supplier = supplierCheck.rows[0]

    // Check for duplicate name for the same supplier
    const existingCheck = await query(
      'SELECT id FROM supplier_pricelists WHERE supplier_id = $1 AND name = $2 AND is_active = true',
      [validatedData.supplierId, validatedData.name]
    )

    if (existingCheck.rows.length > 0 && !validatedData.replaceExisting) {
      return NextResponse.json({
        success: false,
        error: 'Active pricelist with this name already exists for this supplier',
        details: {
          name: validatedData.name,
          existingId: existingCheck.rows[0].id
        }
      }, { status: 409 })
    }

    // If replacing existing, deactivate the old one
    if (existingCheck.rows.length > 0 && validatedData.replaceExisting) {
      await query(
        'UPDATE supplier_pricelists SET is_active = false, updated_at = NOW() WHERE id = $1',
        [existingCheck.rows[0].id]
      )
    }

    // Create new pricelist in database
    const newPricelist = await createPricelistInDB({
      ...validatedData,
      supplierName: supplier.name
    })

    // Get the created pricelist with items
    const items = await getPricelistItemsFromDB(newPricelist.id)

    // Calculate metrics
    const totalValue = validatedData.items.reduce((sum, item) => sum + item.unitPrice, 0)
    const averagePrice = validatedData.items.length > 0 ? totalValue / validatedData.items.length : 0
    const estimatedLeadTime = validatedData.items.reduce((avg, item) =>
      avg + (item.leadTimeDays || 7), 0) / validatedData.items.length

    // Generate import summary
    const importSummary = {
      pricelistId: newPricelist.id,
      itemsImported: validatedData.items.length,
      totalValue,
      averagePrice,
      categories: [...new Set(validatedData.items.map(item => 'General'))].length,
      duplicatesFound: 0,
      validationIssues: 0,
      estimatedLeadTime,
      recommendations: [
        'Review pricing for competitive positioning',
        'Set up automated reorder points',
        'Consider volume discount negotiations'
      ]
    }

    const responseData = {
      ...newPricelist,
      supplierName: supplier.name,
      itemCount: validatedData.items.length,
      totalValue,
      averagePrice,
      items,
      analytics: {
        utilizationRate: 0,
        averageOrderValue: 0,
        topItemBySku: validatedData.items[0]?.sku || '',
        priceVariance: 0,
        lastOrderDate: null
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      importSummary,
      message: 'Pricelist created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating pricelist:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PUT /api/suppliers/pricelists - Update existing pricelist
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = UpdatePricelistSchema.parse(body)

    // Check if pricelist exists
    const existingCheck = await query(
      'SELECT * FROM supplier_pricelists WHERE id = $1',
      [validatedData.id]
    )

    if (existingCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Pricelist not found'
      }, { status: 404 })
    }

    const existingPricelist = existingCheck.rows[0]

    // Check for approval status - can't modify approved pricelists
    if (existingPricelist.approval_status === 'approved' && validatedData.isActive !== false) {
      return NextResponse.json({
        success: false,
        error: 'Cannot modify approved pricelist. Create a new version instead.'
      }, { status: 409 })
    }

    let updatedPricelist: any
    await withTransaction(async (client) => {

      // Update pricelist
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      if (validatedData.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`)
        updateValues.push(validatedData.name)
        paramIndex++
      }

      if (validatedData.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`)
        updateValues.push(validatedData.description)
        paramIndex++
      }

      if (validatedData.effectiveFrom !== undefined) {
        updateFields.push(`effective_from = $${paramIndex}`)
        updateValues.push(validatedData.effectiveFrom)
        paramIndex++
      }

      if (validatedData.effectiveTo !== undefined) {
        updateFields.push(`effective_to = $${paramIndex}`)
        updateValues.push(validatedData.effectiveTo)
        paramIndex++
      }

      if (validatedData.currency !== undefined) {
        updateFields.push(`currency = $${paramIndex}`)
        updateValues.push(validatedData.currency)
        paramIndex++
      }

      if (validatedData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`)
        updateValues.push(validatedData.isActive)
        paramIndex++
      }

      if (validatedData.items !== undefined) {
        // Increment version
        const versionParts = existingPricelist.version.split('.')
        const newVersion = `${versionParts[0]}.${parseInt(versionParts[1] || '0') + 1}`
        updateFields.push(`version = $${paramIndex}`)
        updateValues.push(newVersion)
        paramIndex++
      }

      updateFields.push(`updated_at = NOW()`)
      updateValues.push(validatedData.id)

      const updateQuery = `
        UPDATE supplier_pricelists
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const updateResult = await client.query(updateQuery, updateValues)
      updatedPricelist = updateResult.rows[0]

      // Update items if provided
      if (validatedData.items) {
        // Delete existing items
        await client.query('DELETE FROM pricelist_items WHERE pricelist_id = $1', [validatedData.id])

        // Insert new items
        const itemQueries = validatedData.items.map((item: any) => {
          const itemQuery = `
            INSERT INTO pricelist_items (
              pricelist_id, sku, supplier_sku, unit_price, minimum_quantity,
              maximum_quantity, lead_time_days, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
          `

          return client.query(itemQuery, [
            validatedData.id,
            item.sku,
            item.supplierSku || null,
            item.unitPrice,
            item.minimumQuantity || 1,
            item.maximumQuantity || null,
            item.leadTimeDays || 7,
            item.notes || null
          ])
        })

        await Promise.all(itemQueries)
      }

    })

    const items = await getPricelistItemsFromDB(validatedData.id)
    const responseData = {
      ...updatedPricelist,
      itemCount: items.length,
      items
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Pricelist updated successfully'
    })

  } catch (error) {
    console.error('Error updating pricelist:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/suppliers/pricelists - Delete pricelist
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pricelistId = searchParams.get('id')

    if (!pricelistId) {
      return NextResponse.json({
        success: false,
        error: 'Pricelist ID is required'
      }, { status: 400 })
    }

    // Check if pricelist exists
    const pricelistCheck = await query(
      'SELECT * FROM supplier_pricelists WHERE id = $1',
      [pricelistId]
    )

    if (pricelistCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Pricelist not found'
      }, { status: 404 })
    }

    const pricelist = pricelistCheck.rows[0]

    // Check if pricelist is in use (has orders, etc.)
    const usageCheck = await query(`
      SELECT COUNT(*) as usage_count
      FROM purchase_order_items poi
      JOIN pricelist_items pi ON poi.item_sku = pi.sku
      WHERE pi.pricelist_id = $1
    `, [pricelistId])

    const usageCount = parseInt(usageCheck.rows[0].usage_count)

    if (usageCount > 0) {
      // Soft delete - mark as inactive instead of removing
      await query(`
        UPDATE supplier_pricelists
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `, [pricelistId])

      return NextResponse.json({
        success: true,
        message: 'Pricelist deactivated (soft delete) due to existing usage',
        data: { id: pricelistId, action: 'deactivated' }
      })
    } else {
      // Hard delete - completely remove
      await withTransaction(async (client) => {

        // Delete pricelist items first
        await client.query('DELETE FROM pricelist_items WHERE pricelist_id = $1', [pricelistId])

        // Delete pricelist
        await client.query('DELETE FROM supplier_pricelists WHERE id = $1', [pricelistId])

      })

      return NextResponse.json({
        success: true,
        message: 'Pricelist deleted successfully',
        data: { id: pricelistId, action: 'deleted' }
      })
    }

  } catch (error) {
    console.error('Error deleting pricelist:', error)

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
