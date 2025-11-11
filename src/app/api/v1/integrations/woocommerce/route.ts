/**
 * WooCommerce Integration API
 *
 * Handles CRUD operations for WooCommerce integration configuration
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

interface WooCommerceConfig {
  id?: string;
  name: string;
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  status: 'active' | 'inactive' | 'error';
  auto_sync_products: boolean;
  auto_import_orders: boolean;
  sync_customers: boolean;
  sync_frequency: number;
}

// GET - Fetch WooCommerce configuration
export async function GET(request: NextRequest) {
  try {
    const sql = `
      SELECT
        id,
        name,
        config->>'store_url' as store_url,
        config->>'consumer_key' as consumer_key,
        config->>'consumer_secret' as consumer_secret,
        status::text as status,
        (config->>'auto_sync_products')::boolean as auto_sync_products,
        (config->>'auto_import_orders')::boolean as auto_import_orders,
        (config->>'sync_customers')::boolean as sync_customers,
        (config->>'sync_frequency')::int as sync_frequency
      FROM integration_connector
      WHERE provider = 'woocommerce'
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
    console.error('Error fetching WooCommerce configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch configuration',
      },
      { status: 500 }
    );
  }
}

// POST - Create new WooCommerce configuration
export async function POST(request: NextRequest) {
  try {
    const body: WooCommerceConfig = await request.json();

    const sql = `
      INSERT INTO integration_connector (
        provider,
        name,
        status,
        config,
        created_at,
        updated_at
      ) VALUES (
        'woocommerce',
        $1,
        $2::connector_status,
        $3::jsonb,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        name,
        config->>'store_url' as store_url,
        config->>'consumer_key' as consumer_key,
        config->>'consumer_secret' as consumer_secret,
        status::text as status,
        (config->>'auto_sync_products')::boolean as auto_sync_products,
        (config->>'auto_import_orders')::boolean as auto_import_orders,
        (config->>'sync_customers')::boolean as sync_customers,
        (config->>'sync_frequency')::int as sync_frequency
    `;

    const config = {
      store_url: body.store_url,
      consumer_key: body.consumer_key,
      consumer_secret: body.consumer_secret,
      auto_sync_products: body.auto_sync_products,
      auto_import_orders: body.auto_import_orders,
      sync_customers: body.sync_customers,
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
    console.error('Error creating WooCommerce configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create configuration',
      },
      { status: 500 }
    );
  }
}

// PUT - Update existing WooCommerce configuration
export async function PUT(request: NextRequest) {
  try {
    const body: WooCommerceConfig = await request.json();

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
      store_url: body.store_url,
      consumer_key: body.consumer_key,
      consumer_secret: body.consumer_secret,
      auto_sync_products: body.auto_sync_products,
      auto_import_orders: body.auto_import_orders,
      sync_customers: body.sync_customers,
      sync_frequency: body.sync_frequency,
    };

    const sql = `
      UPDATE integration_connector
      SET
        name = $1,
        status = $2::connector_status,
        config = $3::jsonb,
        updated_at = NOW()
      WHERE id = $4 AND provider = 'woocommerce'
      RETURNING
        id,
        name,
        config->>'store_url' as store_url,
        config->>'consumer_key' as consumer_key,
        config->>'consumer_secret' as consumer_secret,
        status::text as status,
        (config->>'auto_sync_products')::boolean as auto_sync_products,
        (config->>'auto_import_orders')::boolean as auto_import_orders,
        (config->>'sync_customers')::boolean as sync_customers,
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
    console.error('Error updating WooCommerce configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update configuration',
      },
      { status: 500 }
    );
  }
}
