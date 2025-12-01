/**
 * WooCommerce Connection Test API
 *
 * Tests connection to WooCommerce store using provided credentials
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_url, consumer_key, consumer_secret } = body;

    if (!store_url || !consumer_key || !consumer_secret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: store_url, consumer_key, consumer_secret',
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
      },
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
          error: `WooCommerce API returned error: ${response.status} ${response.statusText}`,
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
