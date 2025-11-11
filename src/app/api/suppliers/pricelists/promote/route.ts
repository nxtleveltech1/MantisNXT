  // TODO(SSOT): Migrate writes to core.supplier_product/core.stock_on_hand
import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/database'
import { z } from 'zod'
import { upsertSupplierProduct, setStock } from '@/services/ssot/inventoryService'

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

// GET /api/suppliers/pricelists/promote - Get pricelist items available for promotion
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pricelistId = searchParams.get('pricelistId')
    const supplierId = searchParams.get('supplierId')

    if (!pricelistId || !supplierId) {
      return NextResponse.json({
        success: false,
        error: 'Pricelist ID and Supplier ID are required'
      }, { status: 400 })
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

    return NextResponse.json({
      success: true,
      data: {
        pricelistId,
        supplierId,
        items: itemsWithStatus,
        summary
      }
    })

  } catch (error) {
    console.error('Error fetching pricelist items for promotion:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pricelist items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/suppliers/pricelists/promote - Promote selected items to Product table
export async function POST(request: NextRequest) {
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

            await upsertSupplierProduct({ supplierId: validatedData.supplierId, sku: item.sku, name: item.name })
            await setStock({ supplierId: validatedData.supplierId, sku: item.sku, quantity: 0, unitCost: item.unitPrice, reason: 'pricelist promote update' })

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

          await upsertSupplierProduct({ supplierId: validatedData.supplierId, sku: item.sku, name: item.name })
          await setStock({ supplierId: validatedData.supplierId, sku: item.sku, quantity: 0, unitCost: item.unitPrice, reason: 'pricelist promote create' })
        }

      } catch (itemError) {
        results.skipped++
        results.errors.push(`Error processing ${item.sku}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        pricelistId: validatedData.pricelistId,
        supplierId: validatedData.supplierId,
        results
      },
      message: `Promotion completed. ${results.created} items created, ${results.updated} items updated, ${results.skipped} items skipped.`
    })

  })
}
