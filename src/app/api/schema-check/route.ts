/**
 * EMERGENCY SCHEMA VERIFICATION
 * Check actual column names in database tables
 */

import { Pool } from 'pg';

export async function GET() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mantis_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });

  try {
    // Check suppliers table schema
    const suppliersSchema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'suppliers'
      ORDER BY ordinal_position
    `);

    // Check inventory_items table schema
    const inventorySchema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position
    `);

    // Check purchase_orders table schema
    const poSchema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'purchase_orders'
      ORDER BY ordinal_position
    `);

    return Response.json({
      success: true,
      schemas: {
        suppliers: suppliersSchema.rows,
        inventory_items: inventorySchema.rows,
        purchase_orders: poSchema.rows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Schema check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
