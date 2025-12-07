/**
 * WooCommerce Integration API
 *
 * Handles CRUD operations for WooCommerce integration configuration
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
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
    const orgId = request.headers.get('x-org-id') || '';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orgId)) {
      return NextResponse.json(
        { success: false, error: 'org_id header required (UUID)' },
        { status: 400 }
      );
    }
    const sql = `
      SELECT
        id,
        name,
        config->>'store_url' as store_url,
        status::text as status,
        (config->>'auto_sync_products')::boolean as auto_sync_products,
        (config->>'auto_import_orders')::boolean as auto_import_orders,
        (config->>'sync_customers')::boolean as sync_customers,
        (config->>'sync_frequency')::int as sync_frequency
      FROM integration_connector
      WHERE provider = 'woocommerce' AND org_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await query<unknown>(sql, [orgId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const row: any = result.rows[0];
    const masked = {
      id: row.id,
      name: row.name,
      store_url: row.store_url,
      status: row.status,
      auto_sync_products: row.auto_sync_products,
      auto_import_orders: row.auto_import_orders,
      sync_customers: row.sync_customers,
      sync_frequency: row.sync_frequency,
    };
    return NextResponse.json({ success: true, data: masked });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}

// POST - Create new WooCommerce configuration
export async function POST(request: NextRequest) {
  try {
    const body: WooCommerceConfig = await request.json();
    const orgId = request.headers.get('x-org-id') || '';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orgId)) {
      return NextResponse.json(
        { success: false, error: 'org_id header required (UUID)' },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO integration_connector (
        provider,
        org_id,
        name,
        status,
        config,
        created_at,
        updated_at
      ) VALUES (
        'woocommerce',
        $1,
        $2,
        $3::connector_status,
        $4::jsonb,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        name,
        config->>'store_url' as store_url,
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
      orgId,
      body.name,
      body.status || 'inactive',
      JSON.stringify(config),
    ]);

    const row: any = result.rows[0];
    const masked = {
      id: row.id,
      name: row.name,
      store_url: row.store_url,
      status: row.status,
      auto_sync_products: row.auto_sync_products,
      auto_import_orders: row.auto_import_orders,
      sync_customers: row.sync_customers,
      sync_frequency: row.sync_frequency,
    };
    return NextResponse.json({ success: true, data: masked });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}

// PUT - Update existing WooCommerce configuration
export async function PUT(request: NextRequest) {
  try {
    const body: WooCommerceConfig = await request.json();
    const orgId = request.headers.get('x-org-id') || '';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orgId)) {
      return NextResponse.json(
        { success: false, error: 'org_id header required (UUID)' },
        { status: 400 }
      );
    }

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration ID is required for updates',
        },
        { status: 400 }
      );
    }

    // First, fetch the existing config to preserve credentials if not provided
    const existingResult = await query<{ config: any }>(
      `SELECT config FROM integration_connector WHERE id = $1 AND provider = 'woocommerce' AND org_id = $2`,
      [body.id, orgId]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration not found',
        },
        { status: 404 }
      );
    }

    const existingConfig = existingResult.rows[0].config || {};

    // Only update credentials if new ones are provided (non-empty strings)
    // This prevents overwriting saved credentials when user doesn't re-enter them
    // Handle both undefined (not sent) and empty string cases
    const hasNewConsumerKey =
      body.consumer_key !== undefined && body.consumer_key !== null && body.consumer_key.trim() !== '';
    const hasNewConsumerSecret =
      body.consumer_secret !== undefined && body.consumer_secret !== null && body.consumer_secret.trim() !== '';

    const config = {
      store_url: body.store_url || existingConfig.store_url,
      consumer_key: hasNewConsumerKey ? body.consumer_key : existingConfig.consumer_key || '',
      consumer_secret: hasNewConsumerSecret ? body.consumer_secret : existingConfig.consumer_secret || '',
      auto_sync_products: body.auto_sync_products ?? existingConfig.auto_sync_products ?? true,
      auto_import_orders: body.auto_import_orders ?? existingConfig.auto_import_orders ?? true,
      sync_customers: body.sync_customers ?? existingConfig.sync_customers ?? true,
      sync_frequency: body.sync_frequency ?? existingConfig.sync_frequency ?? 60,
    };

    const sql = `
      UPDATE integration_connector
      SET
        name = $1,
        status = $2::connector_status,
        config = $3::jsonb,
        updated_at = NOW()
      WHERE id = $4 AND provider = 'woocommerce' AND org_id = $5
      RETURNING
        id,
        name,
        config->>'store_url' as store_url,
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
      orgId,
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

    const row: any = result.rows[0];
    const masked = {
      id: row.id,
      name: row.name,
      store_url: row.store_url,
      status: row.status,
      auto_sync_products: row.auto_sync_products,
      auto_import_orders: row.auto_import_orders,
      sync_customers: row.sync_customers,
      sync_frequency: row.sync_frequency,
    };
    return NextResponse.json({ success: true, data: masked });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}
