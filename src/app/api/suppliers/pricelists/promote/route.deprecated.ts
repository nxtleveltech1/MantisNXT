import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/database'
import { z } from 'zod'

/**
 * ⚠️ DEPRECATED ENDPOINT ⚠️
 *
 * This endpoint is deprecated and will be removed in a future version.
 * Please use the NXT-SPP workflow instead:
 *
 * 1. Upload: POST /api/spp/upload
 * 2. Validate: POST /api/spp/validate?upload_id={id}
 * 3. Merge: POST /api/spp/merge?upload_id={id}
 * 4. Select: POST /api/core/selections/workflow
 *
 * Migration Guide: See docs/NXT-SPP-MIGRATION.md
 *
 * Backward compatibility maintained until Q2 2025
 */

const DEPRECATION_MESSAGE = `
⚠️ DEPRECATED: This endpoint will be removed in Q2 2025.
Please migrate to the NXT-SPP workflow:
- POST /api/spp/upload (upload pricelist)
- POST /api/spp/validate?upload_id={id} (validate)
- POST /api/spp/merge?upload_id={id} (merge to CORE)
- POST /api/core/selections/workflow (select products)

See: docs/NXT-SPP-MIGRATION.md
`

// Schema for promoting pricelist items to Product table
const PromoteItemsSchema = z.object({
  pricelistId: z.string().min(1, 'Pricelist ID is required'),
  supplierId: z.string().min(1, 'Supplier ID is required'),
  itemSelections: z.array(z.object({
    pricelistItemId: z.string().min(1, 'Pricelist item ID is required'),
    sku: z.string().min(1, 'SKU is required'),
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
    unitPrice: z.number().positive('Unit price must be positive'),
    currency: z.string().default('ZAR'),
    active: z.boolean().default(true),
    overwriteExisting: z.boolean().default(false)
  })).min(1, 'At least one item must be selected')
})

function addDeprecationHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-API-Deprecated', 'true')
  response.headers.set('X-API-Deprecation-Date', '2025-06-01')
  response.headers.set('X-API-Sunset', '2025-06-01')
  response.headers.set('X-API-Migration-Guide', '/docs/NXT-SPP-MIGRATION.md')
  response.headers.set('X-API-Alternative', 'POST /api/spp/upload')
  return response
}

// GET /api/suppliers/pricelists/promote - Get pricelist items available for promotion
export async function GET(request: NextRequest) {
  console.warn(DEPRECATION_MESSAGE)

  try {
    const { searchParams } = new URL(request.url)
    const pricelistId = searchParams.get('pricelistId')
    const supplierId = searchParams.get('supplierId')

    if (!pricelistId || !supplierId) {
      const response = NextResponse.json({
        success: false,
        error: 'Pricelist ID and Supplier ID are required',
        deprecation_notice: DEPRECATION_MESSAGE
      }, { status: 400 })
      return addDeprecationHeaders(response)
    }

    // In a real implementation, this would query the pricelist and pricelist_items tables
    // For now, I'll create a mock response based on the existing pricelist structure
    const mockPricelistItems = [
      {
        id: 'item_001',
        pricelistId: pricelistId,
        sku: 'ALPHA-PWR-001',
        supplierSku: 'PWR-SUPPLY-500W',
        name: '500W Power Supply Unit',
        description: 'High-efficiency 80+ Gold certified power supply',
        category: 'components',
        unitPrice: 89.99,
        currency: 'ZAR',
        minimumQuantity: 1,
        leadTimeDays: 14,
        inProductTable: false, // Not yet promoted to Product table
        existingProductId: null,
        notes: 'Includes 5-year warranty'
      },
      {
        id: 'item_002',
        pricelistId: pricelistId,
        sku: 'ALPHA-CAB-001',
        supplierSku: 'CAT6-CABLE-100M',
        name: 'CAT6 Network Cable 100m',
        description: 'High-speed ethernet cable for network infrastructure',
        category: 'components',
        unitPrice: 125.50,
        currency: 'ZAR',
        minimumQuantity: 1,
        leadTimeDays: 7,
        inProductTable: false,
        existingProductId: null,
        notes: 'Bulk pricing available'
      },
      {
        id: 'item_003',
        pricelistId: pricelistId,
        sku: 'ALPHA-MON-001',
        supplierSku: 'LED-MONITOR-24',
        name: '24" LED Monitor',
        description: 'Full HD LED monitor with HDMI and VGA inputs',
        category: 'finished_goods',
        unitPrice: 2450.00,
        currency: 'ZAR',
        minimumQuantity: 1,
        leadTimeDays: 10,
        inProductTable: true, // Already promoted
        existingProductId: 'prod_001',
        notes: 'Popular item - high demand'
      }
    ]

    // Check which items already exist in the Product table
    const skusToCheck = mockPricelistItems.map(item => item.sku)
    let existingProducts = []

    if (skusToCheck.length > 0) {
      const existingQuery = `
        SELECT id, sku, name, active
        FROM "Product"
        WHERE sku = ANY($1) AND "supplierId"::text = $2
      `
      const existingResult = await query(existingQuery, [skusToCheck, supplierId])
      existingProducts = existingResult.rows
    }

    // Update items with existing product information
    const itemsWithStatus = mockPricelistItems.map(item => {
      const existingProduct = existingProducts.find(p => p.sku === item.sku)
      return {
        ...item,
        inProductTable: !!existingProduct,
        existingProductId: existingProduct?.id || null,
        existingProductActive: existingProduct?.active || false
      }
    })

    // Calculate summary statistics
    const summary = {
      totalItems: itemsWithStatus.length,
      availableForPromotion: itemsWithStatus.filter(item => !item.inProductTable).length,
      alreadyPromoted: itemsWithStatus.filter(item => item.inProductTable).length,
      totalValue: itemsWithStatus.reduce((sum, item) => sum + item.unitPrice, 0),
      categories: [...new Set(itemsWithStatus.map(item => item.category))],
      averagePrice: itemsWithStatus.length > 0 ?
        itemsWithStatus.reduce((sum, item) => sum + item.unitPrice, 0) / itemsWithStatus.length : 0
    }

    const response = NextResponse.json({
      success: true,
      data: {
        pricelistId,
        supplierId,
        items: itemsWithStatus,
        summary
      },
      deprecation_notice: DEPRECATION_MESSAGE
    })

    return addDeprecationHeaders(response)

  } catch (error) {
    console.error('Error fetching pricelist items for promotion:', error)
    const response = NextResponse.json({
      success: false,
      error: 'Failed to fetch pricelist items',
      details: error instanceof Error ? error.message : 'Unknown error',
      deprecation_notice: DEPRECATION_MESSAGE
    }, { status: 500 })
    return addDeprecationHeaders(response)
  }
}

// POST /api/suppliers/pricelists/promote - Promote selected items to Product table
export async function POST(request: NextRequest) {
  console.warn(DEPRECATION_MESSAGE)

  return await withTransaction(async (client) => {
    const body = await request.json()
    const validatedData = PromoteItemsSchema.parse(body)

    // within transaction

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const item of validatedData.itemSelections) {
      try {
        // Check if product already exists
        const existingQuery = `
          SELECT id, active FROM "Product"
          WHERE sku = $1 AND "supplierId"::text = $2
        `
        const existingResult = await client.query(existingQuery, [item.sku, validatedData.supplierId])

        if (existingResult.rows.length > 0) {
          const existingProduct = existingResult.rows[0]

          if (item.overwriteExisting) {
            // Update existing product
            const updateQuery = `
              UPDATE "Product"
              SET
                name = $1,
                description = $2,
                "categoryId" = $3,
                "basePrice" = $4,
                currency = $5,
                active = $6,
                "updatedAt" = NOW()
              WHERE id = $7
              RETURNING id
            `
            await client.query(updateQuery, [
              item.name,
              item.description,
              item.category,
              item.unitPrice,
              item.currency,
              item.active,
              existingProduct.id
            ])

            results.updated++

            // Update inventory_items if exists
            const inventoryUpdateQuery = `
              UPDATE inventory_items
              SET
                name = $1,
                description = $2,
                category = $3,
                cost_price = $4,
                updated_at = NOW()
              WHERE sku = $5
            `
            await client.query(inventoryUpdateQuery, [
              item.name,
              item.description,
              item.category,
              item.unitPrice,
              item.sku
            ])

          } else {
            results.skipped++
            results.errors.push(`SKU ${item.sku} already exists (use overwriteExisting to update)`)
            continue
          }
        } else {
          // Create new product
          const insertQuery = `
            INSERT INTO "Product" (
              "supplierId", name, description, "categoryId", sku, "basePrice",
              currency, active, "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
            ) RETURNING id
          `
          const insertResult = await client.query(insertQuery, [
            validatedData.supplierId,
            item.name,
            item.description,
            item.category,
            item.sku,
            item.unitPrice,
            item.currency,
            item.active
          ])

          results.created++

          // Create corresponding inventory_items entry
          const inventoryQuery = `
            INSERT INTO inventory_items (
              sku, name, description, category, cost_price, stock_qty,
              reserved_qty, reorder_point, status, location, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, 0, 0, 10, 'active', 'Main Warehouse', NOW(), NOW()
            )
            ON CONFLICT (sku) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              category = EXCLUDED.category,
              cost_price = EXCLUDED.cost_price,
              updated_at = NOW()
          `
          await client.query(inventoryQuery, [
            item.sku,
            item.name,
            item.description,
            item.category,
            item.unitPrice
          ])
        }

      } catch (itemError) {
        results.skipped++
        results.errors.push(`Error processing ${item.sku}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`)
      }
    }

    const response = NextResponse.json({
      success: true,
      data: {
        pricelistId: validatedData.pricelistId,
        supplierId: validatedData.supplierId,
        results
      },
      message: `Promotion completed. ${results.created} items created, ${results.updated} items updated, ${results.skipped} items skipped.`,
      deprecation_notice: DEPRECATION_MESSAGE
    })

    return addDeprecationHeaders(response)
  })
}
