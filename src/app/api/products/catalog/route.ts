import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

interface ProductCatalogItem {
  id: string
  sku: string
  name: string
  description: string
  price: number
  currency: string
  supplier: {
    id: string
    name: string
  }
  pricelist: {
    id: string
    name: string
    validFrom: string
    validTo: string | null
  }
  category?: string
  brand?: string
  inStock: boolean
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  try {
    await client.connect()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')
    const supplier = searchParams.get('supplier')
    const priceRange = searchParams.get('priceRange')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build complex product catalog query
    let query = `
      SELECT 
        pi.id,
        pi.sku,
        pi.name,
        pi.description,
        pi.price,
        p.currency,
        p.id as pricelist_id,
        p.name as pricelist_name,
        p."validFrom",
        p."validTo",
        s.id as supplier_id,
        s.name as supplier_name,
        pi."updatedAt"
      FROM "PricelistItem" pi
      JOIN "Pricelist" p ON pi."pricelistId" = p.id
      JOIN suppliers s ON p."supplierId" = s.id
      WHERE p.active = true
    `

    const queryParams: any[] = []
    let paramIndex = 1

    if (search) {
      query += ` AND (
        LOWER(pi.name) LIKE LOWER($${paramIndex}) OR 
        LOWER(pi.description) LIKE LOWER($${paramIndex}) OR 
        LOWER(pi.sku) LIKE LOWER($${paramIndex})
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    if (supplier) {
      query += ` AND s.id = $${paramIndex}`
      queryParams.push(supplier)
      paramIndex++
    }

    if (priceRange) {
      const [min, max] = priceRange.split('-').map(p => parseFloat(p))
      if (min) {
        query += ` AND pi.price >= $${paramIndex}`
        queryParams.push(min)
        paramIndex++
      }
      if (max) {
        query += ` AND pi.price <= $${paramIndex}`
        queryParams.push(max)
        paramIndex++
      }
    }

    // Add sorting
    const validSortColumns = {
      'name': 'pi.name',
      'price': 'pi.price',
      'supplier': 's.name',
      'updated': 'pi."updatedAt"'
    }

    const sortColumn = validSortColumns[sortBy as keyof typeof validSortColumns] || 'pi.name'
    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC'

    query += `
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const result = await client.query(query, queryParams)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM "PricelistItem" pi
      JOIN "Pricelist" p ON pi."pricelistId" = p.id
      JOIN suppliers s ON p."supplierId" = s.id
      WHERE p.active = true
    `

    const countParams: any[] = []
    let countParamIndex = 1

    if (search) {
      countQuery += ` AND (
        LOWER(pi.name) LIKE LOWER($${countParamIndex}) OR 
        LOWER(pi.description) LIKE LOWER($${countParamIndex}) OR 
        LOWER(pi.sku) LIKE LOWER($${countParamIndex})
      )`
      countParams.push(`%${search}%`)
      countParamIndex++
    }

    if (supplier) {
      countQuery += ` AND s.id = $${countParamIndex}`
      countParams.push(supplier)
      countParamIndex++
    }

    if (priceRange) {
      const [min, max] = priceRange.split('-').map(p => parseFloat(p))
      if (min) {
        countQuery += ` AND pi.price >= $${countParamIndex}`
        countParams.push(min)
        countParamIndex++
      }
      if (max) {
        countQuery += ` AND pi.price <= $${countParamIndex}`
        countParams.push(max)
        countParamIndex++
      }
    }

    const countResult = await client.query(countQuery, countParams)
    const totalCount = parseInt(countResult.rows[0].total)

    const products: ProductCatalogItem[] = result.rows.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      currency: row.currency || 'ZAR',
      supplier: {
        id: row.supplier_id,
        name: row.supplier_name
      },
      pricelist: {
        id: row.pricelist_id,
        name: row.pricelist_name,
        validFrom: row.validFrom,
        validTo: row.validTo
      },
      inStock: true, // Default for now
      lastUpdated: row.updatedAt || new Date().toISOString()
    }))

    // Get price range statistics for faceted search
    const priceStatsQuery = `
      SELECT 
        MIN(pi.price) as min_price,
        MAX(pi.price) as max_price,
        AVG(pi.price) as avg_price
      FROM "PricelistItem" pi
      JOIN "Pricelist" p ON pi."pricelistId" = p.id
      WHERE p.active = true
    `
    const priceStats = await client.query(priceStatsQuery)

    return NextResponse.json({
      products,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      filters: {
        priceRange: {
          min: parseFloat(priceStats.rows[0]?.min_price || '0'),
          max: parseFloat(priceStats.rows[0]?.max_price || '0'),
          average: parseFloat(priceStats.rows[0]?.avg_price || '0')
        }
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: 'live_database',
        totalValue: products.reduce((sum, p) => sum + p.price, 0)
      }
    })

  } catch (error) {
    console.error('Product catalog error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product catalog', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    try {
      await client.end()
    } catch (e) {
      // Ignore connection cleanup errors
    }
  }
}