/**
 * WooCommerce Integration API
 *
 * Handles CRUD operations for WooCommerce integration configuration
 * - Secure authentication
 * - CSRF protection
 * - Input validation
 * - Credential security
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { query } from '@/lib/database';
import {
  validateWriteOperation,
  validateWooCommerceInput,
  sanitizeInput,
} from '@/lib/middleware/woocommerce-auth';
import { SecureCredentialManager } from '@/lib/services/SecureCredentialManager';

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

interface WooCommerceConfigResponse {
  id: string;
  name: string;
  store_url: string;
  status: string;
  auto_sync_products: boolean;
  auto_import_orders: boolean;
  sync_customers: boolean;
  sync_frequency: number;
}

// GET - Fetch WooCommerce configuration
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authValidation = await validateWriteOperation(request);
    if (!authValidation.success) {
      return createErrorResponse(new Error(authValidation.error || 'Unauthorized'), 401);
    }

    const orgId = authValidation.orgId!;
    const result = await query<unknown>(
      `
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
    `,
      [orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const row: any = result.rows[0];
    const masked: WooCommerceConfigResponse = {
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
    // Validate authentication and CSRF
    const authValidation = await validateWriteOperation(request);
    if (!authValidation.success) {
      return createErrorResponse(new Error(authValidation.error || 'Unauthorized'), 401);
    }

    const body: WooCommerceConfig = await request.json();
    const orgId = authValidation.orgId!;
    const userId = authValidation.userId;

    // Sanitize input
    const sanitizedBody = sanitizeInput(body);

    // Validate input format
    const validation = validateWooCommerceInput({
      store_url: sanitizedBody.store_url,
      consumer_key: sanitizedBody.consumer_key,
      consumer_secret: sanitizedBody.consumer_secret,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input format',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Store credentials securely
    const credentialResult = await SecureCredentialManager.storeCredentials({
      consumer_key: sanitizedBody.consumer_key,
      consumer_secret: sanitizedBody.consumer_secret,
      org_id: orgId,
      connector_id: 'woocommerce', // Fixed connector ID
      created_by: userId || undefined,
    });

    if (!credentialResult.success) {
      return createErrorResponse(
        new Error(credentialResult.error || 'Failed to store credentials'),
        500
      );
    }

    // Store configuration without credentials
    const config = {
      store_url: sanitizedBody.store_url,
      auto_sync_products: sanitizedBody.auto_sync_products,
      auto_import_orders: sanitizedBody.auto_import_orders,
      sync_customers: sanitizedBody.sync_customers,
      sync_frequency: sanitizedBody.sync_frequency,
    };

    const result = await query<unknown>(
      `
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
    `,
      [orgId, sanitizedBody.name, sanitizedBody.status || 'inactive', JSON.stringify(config)]
    );

    const row: any = result.rows[0];
    const masked: WooCommerceConfigResponse = {
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
    // Validate authentication and CSRF
    const authValidation = await validateWriteOperation(request);
    if (!authValidation.success) {
      return createErrorResponse(new Error(authValidation.error || 'Unauthorized'), 401);
    }

    const body: WooCommerceConfig = await request.json();
    const orgId = authValidation.orgId!;
    const userId = authValidation.userId;

    // Sanitize input
    const sanitizedBody = sanitizeInput(body);

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration ID is required for updates',
        },
        { status: 400 }
      );
    }

    // Validate store URL if provided
    if (sanitizedBody.store_url) {
      const validation = validateWooCommerceInput({
        store_url: sanitizedBody.store_url,
        consumer_key: sanitizedBody.consumer_key || '',
        consumer_secret: sanitizedBody.consumer_secret || '',
      });

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid store URL format',
            details: validation.errors,
          },
          { status: 400 }
        );
      }
    }

    // Update credentials if provided
    if (sanitizedBody.consumer_key && sanitizedBody.consumer_secret) {
      const credentialResult = await SecureCredentialManager.storeCredentials({
        consumer_key: sanitizedBody.consumer_key,
        consumer_secret: sanitizedBody.consumer_secret,
        org_id: orgId,
        connector_id: 'woocommerce',
        created_by: userId || undefined,
      });

      if (!credentialResult.success) {
        return createErrorResponse(
          new Error(credentialResult.error || 'Failed to update credentials'),
          500
        );
      }
    }

    // Update configuration
    const config = {
      store_url: sanitizedBody.store_url,
      auto_sync_products: sanitizedBody.auto_sync_products,
      auto_import_orders: sanitizedBody.auto_import_orders,
      sync_customers: sanitizedBody.sync_customers,
      sync_frequency: sanitizedBody.sync_frequency,
    };

    const result = await query<unknown>(
      `
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
    `,
      [sanitizedBody.name, sanitizedBody.status || 'inactive', JSON.stringify(config), body.id, orgId]
    );

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
    const masked: WooCommerceConfigResponse = {
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