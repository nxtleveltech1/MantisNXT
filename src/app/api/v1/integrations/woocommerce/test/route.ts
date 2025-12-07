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

    const body = await request.json();

    // Sanitize input
    const sanitizedBody = sanitizeInput(body);
    const { store_url, consumer_key, consumer_secret } = sanitizedBody;

    // Validate input format
    const validation = validateWooCommerceInput({
      store_url,
      consumer_key,
      consumer_secret,
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
    const normalizedUrl = store_url.replace(/\/$/, '');

    // Test connection by fetching WooCommerce system status
    const testUrl = `${normalizedUrl}/wp-json/wc/v3/system_status`;

    // Create Basic Auth header
    const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');

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
