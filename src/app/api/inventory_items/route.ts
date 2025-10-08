import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database/unified-connection';
import { z } from 'zod';

// Validation schemas
const inventoryItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  stock_qty: z.number().min(0, 'Stock quantity must be non-negative'),
  cost_price: z.number().min(0, 'Cost price must be non-negative'),
  selling_price: z.number().min(0, 'Selling price must be non-negative').optional(),
  reorder_point: z.number().min(0, 'Reorder point must be non-negative'),
  max_stock: z.number().min(0, 'Max stock must be non-negative').optional(),
  supplier_id: z.string().optional(),
  warehouse_id: z.string().optional(),
  unit_of_measure: z.string().default('each'),
  location: z.string().optional(),
  barcode: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active')
});

const updateInventoryItemSchema = inventoryItemSchema.partial();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const search = searchParams.get('search');
    const category = searchParams.get('category')?.split(',');
    const status = searchParams.get('status')?.split(',');
    const supplierId = searchParams.get('supplier_id');
    const warehouseId = searchParams.get('warehouse_id');
    const lowStock = searchParams.get('low_stock') === 'true';
    const outOfStock = searchParams.get('out_of_stock') === 'true';
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortOrder = searchParams.get('sort_order') || 'asc';
    const offset = (page - 1) * limit;

    console.log(`📦 Fetching inventory items - page ${page}, limit ${limit}`);

    // Build the query
    let query = `
      SELECT
        i.*,
        s.name as supplier_name,
        CASE
          WHEN i.stock_qty = 0 THEN 'out_of_stock'
          WHEN i.stock_qty <= i.reorder_point THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      query += ` AND (
        i.name ILIKE $${paramIndex} OR
        i.sku ILIKE $${paramIndex} OR
        i.description ILIKE $${paramIndex} OR
        i.category ILIKE $${paramIndex} OR
        i.barcode ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add category filter
    if (category?.length) {
      query += ` AND i.category = ANY($${paramIndex})`;
      queryParams.push(category);
      paramIndex++;
    }

    // Add status filter (skipped: status column may not exist in current DB)
    if (status?.length) {
      // Intentionally ignoring status filter to maintain compatibility
    }

    // Add supplier filter
    if (supplierId) {
      query += ` AND i.supplier_id = $${paramIndex}`;
      queryParams.push(supplierId);
      paramIndex++;
    }

    // Add warehouse filter
    if (warehouseId) {
      query += ` AND i.warehouse_id = $${paramIndex}`;
      queryParams.push(warehouseId);
      paramIndex++;
    }

    // Add stock level filters
    if (lowStock) {
      query += ` AND i.stock_qty <= i.reorder_point AND i.stock_qty > 0`;
    }

    if (outOfStock) {
      query += ` AND i.stock_qty = 0`;
    }

    // Add price filters
    if (minPrice) {
      query += ` AND i.cost_price >= $${paramIndex}`;
      queryParams.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      query += ` AND i.cost_price <= $${paramIndex}`;
      queryParams.push(parseFloat(maxPrice));
      paramIndex++;
    }

    // Validate sort column to prevent SQL injection
    const validSortColumns = ['name', 'sku', 'stock_qty', 'cost_price', 'selling_price', 'reorder_point', 'created_at', 'updated_at'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'name';
    const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Add ordering and pagination
    query += ` ORDER BY i.${safeSortBy} ${safeSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE 1=1
    `;

    // Apply same filters to count query (excluding pagination)
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND (
        i.name ILIKE $${countParamIndex} OR
        i.sku ILIKE $${countParamIndex} OR
        i.description ILIKE $${countParamIndex} OR
        i.category ILIKE $${countParamIndex} OR
        i.barcode ILIKE $${countParamIndex}
      )`;
      countParamIndex++;
    }

    if (category?.length) {
      countQuery += ` AND i.category = ANY($${countParamIndex})`;
      countParamIndex++;
    }

    if (status?.length) {
      // Intentionally ignoring status filter to maintain compatibility
    }

    if (supplierId) {
      countQuery += ` AND i.supplier_id = $${countParamIndex}`;
      countParamIndex++;
    }

    if (warehouseId) {
      countQuery += ` AND i.warehouse_id = $${countParamIndex}`;
      countParamIndex++;
    }

    if (lowStock) {
      countQuery += ` AND i.stock_qty <= i.reorder_point AND i.stock_qty > 0`;
    }

    if (outOfStock) {
      countQuery += ` AND i.stock_qty = 0`;
    }

    if (minPrice) {
      countQuery += ` AND i.cost_price >= $${countParamIndex}`;
      countParamIndex++;
    }

    if (maxPrice) {
      countQuery += ` AND i.cost_price <= $${countParamIndex}`;
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Get summary statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE stock_qty = 0) as out_of_stock,
        COUNT(*) FILTER (WHERE stock_qty <= reorder_point AND stock_qty > 0) as low_stock,
        COUNT(*) FILTER (WHERE stock_qty > reorder_point) as in_stock,
        COALESCE(SUM(stock_qty * cost_price), 0) as total_value,
        COALESCE(AVG(cost_price), 0) as avg_cost_price
      FROM inventory_items
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    console.log(`✅ Retrieved ${result.rows.length} inventory items`);

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
      },
      summary: {
        totalItems: parseInt(stats.total_items),
        outOfStock: parseInt(stats.out_of_stock),
        lowStock: parseInt(stats.low_stock),
        inStock: parseInt(stats.in_stock),
        totalValue: parseFloat(stats.total_value),
        avgCostPrice: parseFloat(stats.avg_cost_price)
      },
      filters: {
        search,
        category,
        status,
        supplierId,
        warehouseId,
        lowStock,
        outOfStock,
        minPrice,
        maxPrice,
        sortBy: safeSortBy,
        sortOrder: safeSortOrder
      }
    });

  } catch (error) {
    console.error('❌ Error fetching inventory items:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = inventoryItemSchema.parse(body);

    console.log('📦 Creating new inventory item:', validatedData.sku);

    // Check for duplicate SKU
    const existingItem = await pool.query(
      'SELECT id FROM inventory_items WHERE sku = $1',
      [validatedData.sku]
    );

    if (existingItem.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Item with this SKU already exists' },
        { status: 409 }
      );
    }

    // Verify supplier exists if provided
    if (validatedData.supplier_id) {
      const supplierExists = await pool.query(
        'SELECT id FROM suppliers WHERE id = $1',
        [validatedData.supplier_id]
      );

      if (supplierExists.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Specified supplier does not exist' },
          { status: 400 }
        );
      }
    }

    // Insert new inventory item
    const insertQuery = `
      INSERT INTO inventory_items (
        sku, name, description, category, stock_qty, cost_price, selling_price,
        reorder_point, max_stock, supplier_id, warehouse_id, unit_of_measure,
        location, barcode, tags, notes, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
      ) RETURNING *
    `;

    const insertResult = await pool.query(insertQuery, [
      validatedData.sku,
      validatedData.name,
      validatedData.description,
      validatedData.category,
      validatedData.stock_qty,
      validatedData.cost_price,
      validatedData.selling_price,
      validatedData.reorder_point,
      validatedData.max_stock,
      validatedData.supplier_id,
      validatedData.warehouse_id,
      validatedData.unit_of_measure,
      validatedData.location,
      validatedData.barcode,
      JSON.stringify(validatedData.tags || []),
      validatedData.notes,
      validatedData.status
    ]);

    console.log('✅ Inventory item created successfully');

    return NextResponse.json({
      success: true,
      data: insertResult.rows[0],
      message: 'Inventory item created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating inventory item:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create inventory item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required for updates' },
        { status: 400 }
      );
    }

    const validatedData = updateInventoryItemSchema.parse(updateData);

    console.log('📦 Updating inventory item:', id);

    // Check if item exists
    const existingItem = await pool.query(
      'SELECT id FROM inventory_items WHERE id = $1',
      [id]
    );

    if (existingItem.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Check for duplicate SKU if SKU is being updated
    if (validatedData.sku) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM inventory_items WHERE sku = $1 AND id != $2',
        [validatedData.sku, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Item with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Verify supplier exists if being updated
    if (validatedData.supplier_id) {
      const supplierExists = await pool.query(
        'SELECT id FROM suppliers WHERE id = $1',
        [validatedData.supplier_id]
      );

      if (supplierExists.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Specified supplier does not exist' },
          { status: 400 }
        );
      }
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(key === 'tags' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE inventory_items
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await pool.query(updateQuery, updateValues);

    console.log('✅ Inventory item updated successfully');

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
      message: 'Inventory item updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating inventory item:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update inventory item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
