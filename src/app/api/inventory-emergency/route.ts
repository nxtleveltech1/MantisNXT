/**
 * EMERGENCY INVENTORY MANAGEMENT API
 * Critical inventory operations - direct database access
 */

import { Pool } from 'pg';

async function createPool(): Promise<Pool> {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mantis_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });
}

export async function GET(request: Request) {
  const pool = await createPool();

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const lowStockOnly = url.searchParams.get('low_stock') === 'true';

    let query = `
      SELECT
        id,
        name as product_name,
        sku,
        stock_qty as current_stock,
        reorder_point as reorder_level,
        supplier_id,
        cost_price as unit_cost,
        updated_at as last_updated,
        CASE
          WHEN stock_qty <= 0 THEN 'OUT_OF_STOCK'
          WHEN stock_qty <= reorder_point THEN 'LOW_STOCK'
          WHEN stock_qty <= reorder_point * 1.5 THEN 'MODERATE_STOCK'
          ELSE 'ADEQUATE_STOCK'
        END as stock_status
      FROM inventory_items
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (lowStockOnly) {
      query += ' WHERE stock_qty <= reorder_point';
    }

    query += ` ORDER BY
      CASE
        WHEN stock_qty <= 0 THEN 1
        WHEN stock_qty <= reorder_point THEN 2
        WHEN stock_qty <= reorder_point * 1.5 THEN 3
        ELSE 4
      END,
      stock_qty ASC
    `;

    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get stock level summary
    const summaryResult = await pool.query(`
      SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN stock_qty <= 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN stock_qty > 0 AND stock_qty <= reorder_point THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN stock_qty > reorder_point THEN 1 ELSE 0 END) as adequate_stock
      FROM inventory_items
    `);

    return Response.json({
      success: true,
      data: {
        inventory: result.rows,
        summary: summaryResult.rows[0],
        pagination: {
          limit,
          offset,
          has_more: result.rows.length === limit
        },
        filters: {
          low_stock_only: lowStockOnly
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch inventory',
      timestamp: new Date().toISOString()
    }, { status: 500 });

  } finally {
    await pool.end();
  }
}

export async function POST(request: Request) {
  const pool = await createPool();

  try {
    const body = await request.json();

    // Basic validation
    if (!body.name || !body.sku) {
      return Response.json({
        success: false,
        error: 'name and sku are required'
      }, { status: 400 });
    }

    const query = `
      INSERT INTO inventory_items (
        name,
        sku,
        stock_qty,
        reorder_point,
        supplier_id,
        cost_price
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        name as product_name,
        sku,
        stock_qty as current_stock,
        reorder_point as reorder_level,
        supplier_id,
        cost_price as unit_cost,
        created_at
    `;

    const values = [
      body.name,
      body.sku,
      body.current_stock || 0,
      body.reorder_level || 10,
      body.supplier_id || null,
      body.unit_cost || 0
    ];

    const result = await pool.query(query, values);

    return Response.json({
      success: true,
      data: {
        inventory_item: result.rows[0]
      },
      message: 'Inventory item created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create inventory item',
      timestamp: new Date().toISOString()
    }, { status: 500 });

  } finally {
    await pool.end();
  }
}

export async function PUT(request: Request) {
  const pool = await createPool();

  try {
    const body = await request.json();

    if (!body.id) {
      return Response.json({
        success: false,
        error: 'Item ID is required for update'
      }, { status: 400 });
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (body.current_stock !== undefined) {
      updateFields.push(`current_stock = $${++paramCount}`);
      values.push(body.current_stock);
    }

    if (body.reorder_level !== undefined) {
      updateFields.push(`reorder_level = $${++paramCount}`);
      values.push(body.reorder_level);
    }

    if (body.unit_cost !== undefined) {
      updateFields.push(`unit_cost = $${++paramCount}`);
      values.push(body.unit_cost);
    }

    if (body.location !== undefined) {
      updateFields.push(`location = $${++paramCount}`);
      values.push(body.location);
    }

    if (updateFields.length === 0) {
      return Response.json({
        success: false,
        error: 'No valid fields to update'
      }, { status: 400 });
    }

    updateFields.push(`last_updated = NOW()`);
    values.push(body.id);

    const query = `
      UPDATE inventory_items
      SET ${updateFields.join(', ')}
      WHERE item_id = $${++paramCount}
      RETURNING
        item_id as id,
        product_name,
        sku,
        current_stock,
        reorder_level,
        supplier_id,
        unit_cost,
        location,
        last_updated
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return Response.json({
        success: false,
        error: 'Inventory item not found'
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        inventory_item: result.rows[0]
      },
      message: 'Inventory item updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update inventory item',
      timestamp: new Date().toISOString()
    }, { status: 500 });

  } finally {
    await pool.end();
  }
}