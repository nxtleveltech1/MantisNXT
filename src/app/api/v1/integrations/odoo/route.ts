/**
 * Odoo Integration API
 *
 * Handles CRUD operations for Odoo ERP integration configuration
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

interface OdooConfig {
  id?: string;
  name: string;
  server_url: string;
  database_name: string;
  username: string;
  api_key: string;
  status: 'active' | 'inactive' | 'error';
  auto_sync_products: boolean;
  auto_sync_customers: boolean;
  auto_sync_orders: boolean;
  auto_sync_invoices: boolean;
  sync_frequency: number;
}

// GET - Fetch Odoo configuration
export async function GET(request: NextRequest) {
  try {
    const sql = `
      SELECT
        id,
        name,
        config->>'server_url' as server_url,
        config->>'database_name' as database_name,
        config->>'username' as username,
        config->>'api_key' as api_key,
        status::text as status,
        (config->>'auto_sync_products')::boolean as auto_sync_products,
        (config->>'auto_sync_customers')::boolean as auto_sync_customers,
        (config->>'auto_sync_orders')::boolean as auto_sync_orders,
        (config->>'auto_sync_invoices')::boolean as auto_sync_invoices,
        (config->>'sync_frequency')::int as sync_frequency
      FROM integration_connector
      WHERE provider = 'odoo'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await query<unknown>(sql);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: unknown) {
    console.error('Error fetching Odoo configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch configuration',
      },
      { status: 500 }
    );
  }
}

// POST - Create new Odoo configuration
export async function POST(request: NextRequest) {
  try {
    const body: OdooConfig = await request.json();

    const sql = `
      INSERT INTO integration_connector (
        provider,
        name,
        status,
        config,
        created_at,
        updated_at
      ) VALUES (
        'odoo',
        $1,
        $2::connector_status,
        $3::jsonb,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        name,
        config->>'server_url' as server_url,
        config->>'database_name' as database_name,
        config->>'username' as username,
        config->>'api_key' as api_key,
        status::text as status,
        (config->>'auto_sync_products')::boolean as auto_sync_products,
        (config->>'auto_sync_customers')::boolean as auto_sync_customers,
        (config->>'auto_sync_orders')::boolean as auto_sync_orders,
        (config->>'auto_sync_invoices')::boolean as auto_sync_invoices,
        (config->>'sync_frequency')::int as sync_frequency
    `;

    const config = {
      server_url: body.server_url,
      database_name: body.database_name,
      username: body.username,
      api_key: body.api_key,
      auto_sync_products: body.auto_sync_products,
      auto_sync_customers: body.auto_sync_customers,
      auto_sync_orders: body.auto_sync_orders,
      auto_sync_invoices: body.auto_sync_invoices,
      sync_frequency: body.sync_frequency,
    };

    const result = await query<unknown>(sql, [
      body.name,
      body.status || 'inactive',
      JSON.stringify(config),
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: unknown) {
    console.error('Error creating Odoo configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create configuration',
      },
      { status: 500 }
    );
  }
}

// PUT - Update existing Odoo configuration
export async function PUT(request: NextRequest) {
  try {
    const body: OdooConfig = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration ID is required for updates',
        },
        { status: 400 }
      );
    }

    const config = {
      server_url: body.server_url,
      database_name: body.database_name,
      username: body.username,
      api_key: body.api_key,
      auto_sync_products: body.auto_sync_products,
      auto_sync_customers: body.auto_sync_customers,
      auto_sync_orders: body.auto_sync_orders,
      auto_sync_invoices: body.auto_sync_invoices,
      sync_frequency: body.sync_frequency,
    };

    const sql = `
      UPDATE integration_connector
      SET
        name = $1,
        status = $2::connector_status,
        config = $3::jsonb,
        updated_at = NOW()
      WHERE id = $4 AND provider = 'odoo'
      RETURNING
        id,
        name,
        config->>'server_url' as server_url,
        config->>'database_name' as database_name,
        config->>'username' as username,
        config->>'api_key' as api_key,
        status::text as status,
        (config->>'auto_sync_products')::boolean as auto_sync_products,
        (config->>'auto_sync_customers')::boolean as auto_sync_customers,
        (config->>'auto_sync_orders')::boolean as auto_sync_orders,
        (config->>'auto_sync_invoices')::boolean as auto_sync_invoices,
        (config->>'sync_frequency')::int as sync_frequency
    `;

    const result = await query<unknown>(sql, [
      body.name,
      body.status || 'inactive',
      JSON.stringify(config),
      body.id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: unknown) {
    console.error('Error updating Odoo configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update configuration',
      },
      { status: 500 }
    );
  }
}
