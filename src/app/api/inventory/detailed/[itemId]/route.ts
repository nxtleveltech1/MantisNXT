import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/database'
import { z } from 'zod'

// Validation schema for detailed inventory query parameters
const DetailedInventoryQuerySchema = z.object({
  includeHistory: z.boolean().default(true),
  includeAnalytics: z.boolean().default(true),
  includeRelated: z.boolean().default(true),
  historyLimit: z.number().min(1).max(100).default(20)
})

interface DetailedInventoryItem {
  id: string
  sku: string
  name: string
  description: string
  category: string

  // Current stock information
  currentStock: number
  reservedStock: number
  availableStock: number
  reorderPoint: number
  maxStock: number
  minStock: number

  // Financial information
  unitCost: number
  totalValue: number
  currency: string

  // Location and logistics
  location: string
  weight: number
  dimensions: any

  // Status and timestamps
  status: string
  lastStockUpdate: string
  createdAt: string
  updatedAt: string

  // Additional metadata
  tags: string[]
  notes: string
  customFields: any
}

interface SupplierDetails {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  leadTimeDays: number
  minimumOrderQuantity: number
  paymentTerms: string
  preferredSupplier: boolean
  performanceRating: number
  lastOrderDate: string | null
}

interface ProductDetails {
  id: string
  name: string
  description: string
  category: string
  sku: string
  basePrice: number
  supplierSku: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// GET /api/inventory/detailed/[itemId] - Get comprehensive inventory item details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  // No explicit connection retained; use shared query helper per call

  try {
    const { itemId } = await params
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryParams = {
      includeHistory: searchParams.get('includeHistory') !== 'false',
      includeAnalytics: searchParams.get('includeAnalytics') !== 'false',
      includeRelated: searchParams.get('includeRelated') !== 'false',
      historyLimit: parseInt(searchParams.get('historyLimit') || '20')
    }

    const validated = DetailedInventoryQuerySchema.parse(queryParams)

    // Main query to get detailed inventory item information
    const itemQuery = `
      SELECT
        i.*,
        (i.stock_qty * i.cost_price) as total_value,

        -- Product information
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p."categoryId" as product_category,
        p."basePrice" as product_base_price,
        p.active as product_active,
        p."createdAt" as product_created_at,
        p."updatedAt" as product_updated_at,

        -- Supplier information
        s.id as supplier_id,
        s.name as supplier_name,
        s.contact_person as supplier_contact_person,
        s.email as supplier_email,
        s.phone as supplier_phone,
        s.lead_time as supplier_lead_time,
        s.payment_terms as supplier_payment_terms,
        s.preferred_supplier as supplier_preferred,

        -- Supplier performance (from supplier_performance table if exists)
        sp.overall_rating as supplier_performance_rating,
        sp.on_time_delivery_rate as supplier_delivery_rate,
        sp.quality_rating as supplier_quality_rating,

        -- Stock status
        CASE
          WHEN i.stock_qty = 0 THEN 'out_of_stock'
          WHEN i.stock_qty <= i.reorder_point THEN 'low_stock'
          WHEN i.max_stock > 0 AND i.stock_qty > i.max_stock THEN 'overstocked'
          ELSE 'in_stock'
        END as stock_status

      FROM inventory_items i
      LEFT JOIN "Product" p ON i.sku = p.sku
      LEFT JOIN suppliers s ON p."supplierId"::text = s.id
      LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
      WHERE i.id = $1
    `

    const itemResult = await query(itemQuery, [itemId])

    if (itemResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Inventory item not found'
      }, { status: 404 })
    }

    const row = itemResult.rows[0]

    // Transform main item data
    const item: DetailedInventoryItem = {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      currentStock: row.stock_qty,
      reservedStock: row.reserved_qty || 0,
      availableStock: row.available_qty || row.stock_qty,
      reorderPoint: row.reorder_point,
      maxStock: row.max_stock || 0,
      minStock: 0, // Not in current schema
      unitCost: parseFloat(row.cost_price || '0'),
      totalValue: parseFloat(row.total_value || '0'),
      currency: row.currency || 'ZAR',
      location: row.location || 'Unassigned',
      weight: row.weight || 0,
      dimensions: row.dimensions || {},
      status: row.stock_status,
      lastStockUpdate: row.updated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: row.tags || [],
      notes: row.notes || '',
      customFields: row.custom_fields || {}
    }

    // Supplier details
    const supplier: SupplierDetails | null = row.supplier_id ? {
      id: row.supplier_id,
      name: row.supplier_name || 'Unknown Supplier',
      contactPerson: row.supplier_contact_person || '',
      email: row.supplier_email || '',
      phone: row.supplier_phone || '',
      leadTimeDays: row.supplier_lead_time || 14,
      minimumOrderQuantity: 1, // Default value, would need supplier_inventory_configurations table
      paymentTerms: row.supplier_payment_terms || 'Net 30',
      preferredSupplier: row.supplier_preferred || false,
      performanceRating: parseFloat(row.supplier_performance_rating || '0'),
      lastOrderDate: null // Would need purchase order data
    } : null

    // Product details
    const product: ProductDetails | null = row.product_id ? {
      id: row.product_id,
      name: row.product_name || row.name,
      description: row.product_description || row.description || '',
      category: row.product_category || row.category || '',
      sku: row.sku,
      basePrice: parseFloat(row.product_base_price || '0'),
      supplierSku: row.sku, // Assuming same for now
      active: row.product_active || true,
      createdAt: row.product_created_at || row.created_at,
      updatedAt: row.product_updated_at || row.updated_at
    } : null

    let stockHistory = []
    if (validated.includeHistory) {
      try {
        // Get stock movement history
        const historyQuery = `
          SELECT
            id,
            movement_type,
            quantity,
            previous_quantity,
            new_quantity,
            unit_cost,
            total_cost,
            reference,
            reason,
            notes,
            created_at,
            created_by
          FROM stock_movements
          WHERE inventory_item_id = $1
          ORDER BY created_at DESC
          LIMIT $2
        `

        const historyResult = await query(historyQuery, [itemId, validated.historyLimit])
        stockHistory = historyResult.rows.map(historyRow => ({
          id: historyRow.id,
          type: historyRow.movement_type,
          quantity: historyRow.quantity,
          previousQuantity: historyRow.previous_quantity,
          newQuantity: historyRow.new_quantity,
          unitCost: parseFloat(historyRow.unit_cost || '0'),
          totalCost: parseFloat(historyRow.total_cost || '0'),
          reference: historyRow.reference,
          reason: historyRow.reason,
          notes: historyRow.notes,
          timestamp: historyRow.created_at,
          createdBy: historyRow.created_by
        }))
      } catch (error) {
        console.warn('Stock movements query failed, continuing without history:', error)
        stockHistory = []
      }
    }

    let predictiveAnalytics = null
    if (validated.includeAnalytics) {
      // Calculate basic predictive analytics
      const currentDate = new Date()
      const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000)

      try {
        // Calculate consumption rate from stock movements
        const consumptionQuery = `
          SELECT
            SUM(CASE WHEN movement_type IN ('sale', 'consumption', 'adjustment_out') THEN ABS(quantity) ELSE 0 END) as total_consumed,
            COUNT(CASE WHEN movement_type IN ('sale', 'consumption', 'adjustment_out') THEN 1 END) as consumption_transactions,
            AVG(CASE WHEN movement_type IN ('sale', 'consumption', 'adjustment_out') THEN ABS(quantity) END) as avg_consumption
          FROM stock_movements
          WHERE inventory_item_id = $1
            AND created_at >= $2
            AND movement_type IN ('sale', 'consumption', 'adjustment_out')
        `

        const consumptionResult = await query(consumptionQuery, [itemId, thirtyDaysAgo])
        const consumptionData = consumptionResult.rows[0]

        const totalConsumed = parseFloat(consumptionData.total_consumed || '0')
        const dailyConsumptionRate = totalConsumed / 30 // Average per day
        const daysUntilReorder = dailyConsumptionRate > 0 ?
          Math.max(0, (item.currentStock - item.reorderPoint) / dailyConsumptionRate) : 0

        const suggestedReorderPoint = Math.max(
          item.reorderPoint,
          Math.ceil(dailyConsumptionRate * (supplier?.leadTimeDays || 14) * 1.2) // 20% safety stock
        )

        predictiveAnalytics = {
          dailyConsumptionRate,
          daysUntilReorder: Math.round(daysUntilReorder),
          suggestedReorderPoint,
          nextRestockDate: dailyConsumptionRate > 0 ?
            new Date(currentDate.getTime() + daysUntilReorder * 24 * 60 * 60 * 1000).toISOString() : null,
          forecastedDemand: Array.from({ length: 12 }, (_, i) => Math.round(dailyConsumptionRate * 30)), // Next 12 months
          stockoutRisk: item.currentStock <= item.reorderPoint ? 'high' :
                       item.currentStock <= item.reorderPoint * 1.5 ? 'medium' : 'low',
          turnoverRate: totalConsumed > 0 && item.totalValue > 0 ?
            (totalConsumed * item.unitCost * 12) / item.totalValue : 0
        }
      } catch (error) {
        console.warn('Analytics calculation failed:', error)
        predictiveAnalytics = {
          dailyConsumptionRate: 0,
          daysUntilReorder: 0,
          suggestedReorderPoint: item.reorderPoint,
          nextRestockDate: null,
          forecastedDemand: Array(12).fill(0),
          stockoutRisk: 'unknown',
          turnoverRate: 0
        }
      }
    }

    let relatedItems = []
    if (validated.includeRelated && item.category) {
      try {
        // Find related items in same category or from same supplier
        const relatedQuery = `
          SELECT
            i.id,
            i.sku,
            i.name,
            i.stock_qty,
            i.cost_price,
            i.category,
            (i.stock_qty * i.cost_price) as total_value,
            CASE
              WHEN i.stock_qty = 0 THEN 'out_of_stock'
              WHEN i.stock_qty <= i.reorder_point THEN 'low_stock'
              ELSE 'in_stock'
            END as status
          FROM inventory_items i
          LEFT JOIN "Product" p ON i.sku = p.sku
          WHERE i.id != $1
            AND (
              i.category = $2
              OR p."supplierId" = $3
            )
          ORDER BY
            CASE WHEN i.category = $2 THEN 1 ELSE 2 END,
            i.name
          LIMIT 10
        `

        const relatedResult = await query(relatedQuery, [
          itemId,
          item.category,
          supplier?.id
        ])

        relatedItems = relatedResult.rows.map(relatedRow => ({
          id: relatedRow.id,
          sku: relatedRow.sku,
          name: relatedRow.name,
          currentStock: relatedRow.stock_qty,
          unitCost: parseFloat(relatedRow.cost_price || '0'),
          totalValue: parseFloat(relatedRow.total_value || '0'),
          category: relatedRow.category,
          status: relatedRow.status,
          relationshipType: relatedRow.category === item.category ? 'same_category' : 'same_supplier'
        }))
      } catch (error) {
        console.warn('Related items query failed:', error)
        relatedItems = []
      }
    }

    // Get any relevant documents (if document management exists)
    let documents = []
    try {
      const documentsQuery = `
        SELECT
          id,
          name,
          type,
          file_url,
          file_size,
          upload_date,
          uploaded_by
        FROM inventory_documents
        WHERE inventory_item_id = $1
          AND is_active = true
        ORDER BY upload_date DESC
        LIMIT 20
      `

      const documentsResult = await client.query(documentsQuery, [itemId])
      documents = documentsResult.rows
    } catch (error) {
      // Documents table might not exist
      documents = []
    }

    return NextResponse.json({
      success: true,
      data: {
        item,
        supplier,
        product,
        stockHistory,
        predictiveAnalytics,
        relatedItems,
        documents,
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataFreshness: 'real-time',
          includeHistory: validated.includeHistory,
          includeAnalytics: validated.includeAnalytics,
          includeRelated: validated.includeRelated
        }
      }
    })

  } catch (error) {
    console.error('Error fetching detailed inventory information:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch detailed inventory information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    // no explicit release needed with shared query helper
  }
}

// PATCH /api/inventory/detailed/[itemId] - Update inventory item details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const client = await pool.connect()

  try {
    const { itemId } = await params
    const body = await request.json()

    const {
      reorderPoint,
      maxStock,
      location,
      notes,
      tags,
      customFields
    } = body

    await client.query('BEGIN')

    // Update inventory item
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (reorderPoint !== undefined) {
      updateFields.push(`reorder_point = $${paramIndex}`)
      updateValues.push(reorderPoint)
      paramIndex++
    }

    if (maxStock !== undefined) {
      updateFields.push(`max_stock = $${paramIndex}`)
      updateValues.push(maxStock)
      paramIndex++
    }

    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex}`)
      updateValues.push(location)
      paramIndex++
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`)
      updateValues.push(notes)
      paramIndex++
    }

    if (tags !== undefined) {
      updateFields.push(`tags = $${paramIndex}`)
      updateValues.push(JSON.stringify(tags))
      paramIndex++
    }

    if (customFields !== undefined) {
      updateFields.push(`custom_fields = $${paramIndex}`)
      updateValues.push(JSON.stringify(customFields))
      paramIndex++
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(itemId)

    const updateQuery = `
      UPDATE inventory_items
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const updateResult = await client.query(updateQuery, updateValues)

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({
        success: false,
        error: 'Inventory item not found'
      }, { status: 404 })
    }

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
      message: 'Inventory item updated successfully'
    })

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error updating inventory item:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory item',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    client.release()
  }
}
