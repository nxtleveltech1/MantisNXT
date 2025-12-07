/**
 * WooCommerce Connection Test API
 *
 * Tests connection to WooCommerce store using provided credentials
 * - Secure input validation
 * - CSRF protection
 * - Rate limiting
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import {
  validateWooCommerceInput,
  sanitizeInput,
} from '@/lib/middleware/woocommerce-auth';
import { getRateLimiter } from '@/lib/utils/rate-limiter';
import { query } from '@/lib/database';
import { SecureCredentialManager } from '@/lib/services/SecureCredentialManager';
import { InputValidator, CSRFProtection } from '@/lib/utils/secure-storage';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = request.ip || 'unknown';
    const limiter = getRateLimiter(`woocommerce:test:${ip}`, 10, 1);
    if (!limiter.tryConsume(1)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        }
      );
    }

    // Note: This endpoint is public (in middleware allowlist) and only tests external credentials
    // CSRF validation skipped as this is a connection test endpoint without org context

    const body = await request.json().catch(() => ({}));

    // Sanitize input
    const sanitizedBody = sanitizeInput(body);
    const orgId = request.headers.get('x-org-id') || '';
    const csrfToken = request.headers.get('x-csrf-token') || '';

    let storeUrl: string = sanitizedBody.store_url || '';
    let consumerKey: string = sanitizedBody.consumer_key || '';
    let consumerSecret: string = sanitizedBody.consumer_secret || '';

    const wantsStoredCredentials =
      sanitizedBody.useStoredCredentials === true || !consumerKey || !consumerSecret;

    if (wantsStoredCredentials) {
      // Require org context to fetch stored credentials
      if (!InputValidator.isValidUUID(orgId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'org_id header required to use stored credentials',
          },
          { status: 400 }
        );
      }

      // CSRF validation to avoid cross-site credential usage
      const csrfValid = await CSRFProtection.validateToken(csrfToken);
      if (!csrfValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid or missing CSRF token' },
          { status: 403 }
        );
      }

      // Load connector config
      const connectorRes = await query<{ id: string; config: any }>(
        `SELECT id, config FROM integration_connector
         WHERE provider = 'woocommerce' AND org_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [orgId]
      );

      if (connectorRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No WooCommerce connector found for this organization' },
          { status: 404 }
        );
      }

      const connector = connectorRes.rows[0];
      const config = connector.config || {};

      storeUrl =
        storeUrl ||
        config.store_url ||
        config.url ||
        config.storeUrl ||
        config.base_url ||
        '';
      consumerKey = consumerKey || config.consumer_key || config.consumerKey || '';
      consumerSecret =
        consumerSecret || config.consumer_secret || config.consumerSecret || '';

      // Try secure credential store if still missing
      if (!consumerKey || !consumerSecret) {
        const connectorCandidates = [connector.id, 'woocommerce'];
        for (const connectorId of connectorCandidates) {
          const creds = await SecureCredentialManager.getCredentials(orgId, connectorId);
          if (creds.success && creds.credentials) {
            consumerKey = creds.credentials.consumer_key;
            consumerSecret = creds.credentials.consumer_secret;
            break;
          }
        }
      }

      if (!consumerKey || !consumerSecret) {
        return NextResponse.json(
          {
            success: false,
            error: 'No stored WooCommerce credentials found. Please enter a key and secret.',
          },
          { status: 400 }
        );
      }
    }

    // Validate final inputs
    const validation = validateWooCommerceInput({
      store_url: storeUrl,
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
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

    // Normalize store URL (remove trailing slash)
    const normalizedUrl = storeUrl.replace(/\/$/, '');

    // Test connection by fetching WooCommerce system status
    const testUrl = `${normalizedUrl}/wp-json/wc/v3/system_status`;

    // Create Basic Auth header
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MantisNXT-WooCommerce-Integration/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WooCommerce API error:', response.status, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed. Please check your consumer key and secret.',
          },
          { status: 401 }
        );
      }

      if (response.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: 'WooCommerce API not found. Please verify your store URL.',
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `WooCommerce API returned error: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        message: 'Successfully connected to WooCommerce store',
        wc_version: data.environment?.version || 'Unknown',
        wp_version: data.environment?.wp_version || 'Unknown',
        store_name: data.settings?.general?.title || 'Unknown',
        usedStoredCredentials: wantsStoredCredentials,
      },
    });
  } catch (error: any) {
    console.error('Connection test error:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection timeout. Please check your store URL and try again.',
        },
        { status: 408 }
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not reach the WooCommerce store. Please check your store URL.',
        },
        { status: 503 }
      );
    }

    return createErrorResponse(error, 500);
  }
}
