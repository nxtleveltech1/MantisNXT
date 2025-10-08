/**
 * EMERGENCY SUPPLIER MANAGEMENT API
 * Critical business operations - direct database access
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
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const query = `
      SELECT
        id,
        name,
        email,
        phone,
        address,
        status,
        performance_tier as tier,
        created_at
      FROM suppliers
      ORDER BY name ASC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM suppliers');

    return Response.json({
      success: true,
      data: {
        suppliers: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
          has_more: result.rows.length === limit
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch suppliers',
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
    if (!body.name || !body.email) {
      return Response.json({
        success: false,
        error: 'Name and email are required'
      }, { status: 400 });
    }

    const query = `
      INSERT INTO suppliers (name, email, phone, address, status, performance_tier)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, phone, address, status, performance_tier as tier, created_at
    `;

    const values = [
      body.name,
      body.email,
      body.phone || null,
      body.address || null,
      body.status || 'active',
      body.tier || 'standard'
    ];

    const result = await pool.query(query, values);

    return Response.json({
      success: true,
      data: {
        supplier: result.rows[0]
      },
      message: 'Supplier created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create supplier',
      timestamp: new Date().toISOString()
    }, { status: 500 });

  } finally {
    await pool.end();
  }
}