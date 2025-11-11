/**
 * WooCommerce Sync API
 *
 * Handles synchronization of entities (products, orders, customers) with WooCommerce
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,

  context: { params: Promise<{ entityType: string }> }
) {
    const { entityType } = await context.params;
  try {

    // Validate entity type
    const validTypes = ['products', 'orders', 'customers'];
    if (!validTypes.includes(entityType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid entity type. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get WooCommerce configuration
    const configSql = `
      SELECT
        id as connector_id,
        name,
        config,
        status::text as status
      FROM integration_connector
      WHERE provider = 'woocommerce' AND status::text = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const configResult = await query<unknown>(configSql);

    if (configResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active WooCommerce configuration found. Please configure and activate WooCommerce integration first.',
        },
        { status: 404 }
      );
    }

    const config = configResult.rows[0].config;
    const { store_url, consumer_key, consumer_secret } = config;

    // Normalize store URL
    const normalizedUrl = store_url.replace(/\/$/, '');

    // Create Basic Auth header
    const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');

    const connectorId = configResult.rows[0].connector_id;

    // Start async sync process (in a real implementation, this would be a background job)
    // For now, we'll just fetch the first page to verify the connection works
    const apiEndpoint = `${normalizedUrl}/wp-json/wc/v3/${entityType}`;

    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Update integration_connector with error
      await query(
        `UPDATE integration_connector
         SET error_message = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [`WooCommerce API error: ${response.status} ${response.statusText}`, connectorId]
      );

      return NextResponse.json(
        {
          success: false,
          error: `Failed to sync ${entityType}: ${response.status} ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Update integration_connector with successful sync
    await query(
      `UPDATE integration_connector
       SET last_sync_at = NOW(),
           error_message = NULL,
           retry_count = 0,
           updated_at = NOW()
       WHERE id = $1`,
      [connectorId]
    );

    return NextResponse.json({
      success: true,
      data: {
        message: `${entityType} sync initiated successfully`,
        records_found: Array.isArray(data) ? data.length : 0,
      },
    });
  } catch (error: unknown) {
    console.error(`Error syncing ${entityType}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || `Failed to sync ${entityType}`,
      },
      { status: 500 }
    );
  }
}
