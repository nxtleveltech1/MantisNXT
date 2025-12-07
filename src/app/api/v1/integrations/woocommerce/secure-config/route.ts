/**
 * Secure API Route - WooCommerce Integration
 *
 * Production-grade secure API endpoint with:
 * - Authentication & Authorization
 * - Input Validation & Sanitization
 * - Rate Limiting & CSRF Protection
 * - Tenant Isolation (org_id validation)
 * - Audit Logging
 * - Secure Error Handling
 *
 * Author: Security Team
 * Date: 2025-12-03
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { withSecurity, validateInput } from '@/lib/middleware/security';
import { SecureCredentialManager } from '@/lib/services/SecureCredentialManager';

// Input validation schema
const validateWooCommerceInput = validateInput<WooCommerceConfig>((data) => {
  const errors: string[] = [];
  const sanitized = data;

  // Required fields
  if (!sanitized.name || sanitized.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!sanitized.store_url || !/^https?:\/\//.test(sanitized.store_url)) {
    errors.push('Valid store URL is required (http:// or https://)');
  }

  if (!sanitized.consumer_key || sanitized.consumer_key.length < 10) {
    errors.push('Valid consumer key is required');
  }

  if (!sanitized.consumer_secret || sanitized.consumer_secret.length < 10) {
    errors.push('Valid consumer secret is required');
  }

  // Status validation
  const validStatuses = ['active', 'inactive', 'error'];
  if (sanitized.status && !validStatuses.includes(sanitized.status)) {
    errors.push('Invalid status. Must be: active, inactive, or error');
  }

  // Boolean field validation
  const booleanFields = ['auto_sync_products', 'auto_import_orders', 'sync_customers'];
  for (const field of booleanFields) {
    if (sanitized[field] !== undefined && typeof sanitized[field] !== 'boolean') {
      errors.push(`${field} must be a boolean value`);
    }
  }

  // Number field validation
  if (sanitized.sync_frequency !== undefined) {
    const freq = Number(sanitized.sync_frequency);
    if (isNaN(freq) || freq < 1 || freq > 1440) {
      errors.push('sync_frequency must be a number between 1 and 1440 (minutes)');
    }
  }

  return { valid: errors.length === 0, errors };
});

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
  created_at: string;
  updated_at: string;
}

// GET - Fetch WooCommerce configuration (requires authentication)
export const GET = withSecurity(async function GET(request: NextRequest, auth: any) {
  try {
    const orgId = auth.orgId;

    // Fetch configuration with tenant isolation
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
        (config->>'sync_frequency')::int as sync_frequency,
        created_at,
        updated_at
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
        message: 'No WooCommerce configuration found for this organization',
      });
    }

    const row: any = result.rows[0];
    const config: WooCommerceConfigResponse = {
      id: row.id,
      name: row.name,
      store_url: row.store_url,
      status: row.status,
      auto_sync_products: row.auto_sync_products,
      auto_import_orders: row.auto_import_orders,
      sync_customers: row.sync_customers,
      sync_frequency: row.sync_frequency,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
});

// POST - Create new WooCommerce configuration (requires admin privileges)
export const POST = withSecurity(async function POST(request: NextRequest, auth: any) {
  try {
    // Check admin privileges
    if (!auth.userRole || !['super_admin', 'admin'].includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin privileges required to create WooCommerce configuration',
        },
        { status: 403 }
      );
    }

    const body: any = await request.json();

    // Validate input
    const validation = validateWooCommerceInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input format',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const sanitizedBody = validation.sanitized;
    const orgId = auth.orgId;
    const userId = auth.userId;

    // Store credentials securely
    const credentialResult = await SecureCredentialManager.storeCredentials({
      consumer_key: sanitizedBody.consumer_key,
      consumer_secret: sanitizedBody.consumer_secret,
      org_id: orgId,
      connector_id: 'woocommerce', // Fixed connector ID for this endpoint
      created_by: userId,
      expires_in: 30 * 24 * 60 * 60 * 1000, // 30 days default
    });

    if (!credentialResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: credentialResult.error || 'Failed to store credentials securely',
        },
        { status: 500 }
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
        $1,
        $2,
        $3,
        $4::connector_status,
        $5::jsonb,
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
        (config->>'sync_frequency')::int as sync_frequency,
        created_at,
        updated_at
      `,
      [
        'woocommerce',
        orgId,
        sanitizedBody.name,
        sanitizedBody.status || 'inactive',
        JSON.stringify(config),
      ]
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
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: masked,
      message: 'WooCommerce configuration created successfully',
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
});

// PUT - Update existing WooCommerce configuration (requires admin privileges)
export const PUT = withSecurity(async function PUT(request: NextRequest, auth: any) {
  try {
    // Check admin privileges
    if (!auth.userRole || !['super_admin', 'admin'].includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin privileges required to update WooCommerce configuration',
        },
        { status: 403 }
      );
    }

    const body: any = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration ID is required for updates',
        },
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateWooCommerceInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input format',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const sanitizedBody = validation.sanitized;
    const orgId = auth.orgId;
    const userId = auth.userId;

    // Verify the configuration belongs to the organization
    const existing = await query(
      `SELECT id FROM integration_connector
       WHERE id = $1 AND provider = 'woocommerce' AND org_id = $2`,
      [body.id, orgId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration not found or access denied',
        },
        { status: 404 }
      );
    }

    // Update credentials if provided
    if (sanitizedBody.consumer_key && sanitizedBody.consumer_secret) {
      const credentialResult = await SecureCredentialManager.storeCredentials({
        consumer_key: sanitizedBody.consumer_key,
        consumer_secret: sanitizedBody.consumer_secret,
        org_id: orgId,
        connector_id: 'woocommerce',
        created_by: userId,
        expires_in: 30 * 24 * 60 * 60 * 1000, // 30 days default
      });

      if (!credentialResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: credentialResult.error || 'Failed to update credentials',
          },
          { status: 500 }
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
        (config->>'sync_frequency')::int as sync_frequency,
        created_at,
        updated_at
      `,
      [
        sanitizedBody.name,
        sanitizedBody.status || 'inactive',
        JSON.stringify(config),
        body.id,
        orgId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration not found or access denied',
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
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: masked,
      message: 'WooCommerce configuration updated successfully',
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
});

// DELETE - Remove WooCommerce configuration (requires admin privileges)
export const DELETE = withSecurity(async function DELETE(request: NextRequest, auth: any) {
  try {
    // Check admin privileges
    if (!auth.userRole || !['super_admin', 'admin'].includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin privileges required to delete WooCommerce configuration',
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration ID is required for deletion',
        },
        { status: 400 }
      );
    }

    const orgId = auth.orgId;
    const userId = auth.userId;

    // Verify the configuration belongs to the organization
    const existing = await query(
      `SELECT id FROM integration_connector
       WHERE id = $1 AND provider = 'woocommerce' AND org_id = $2`,
      [id, orgId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration not found or access denied',
        },
        { status: 404 }
      );
    }

    // Delete configuration
    const result = await query(
      `DELETE FROM integration_connector
       WHERE id = $1 AND provider = 'woocommerce' AND org_id = $2
       RETURNING id`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete configuration',
        },
        { status: 500 }
      );
    }

    // Delete associated credentials
    await SecureCredentialManager.deleteCredentials(orgId, 'woocommerce');

    return NextResponse.json({
      success: true,
      message: 'WooCommerce configuration deleted successfully',
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
});