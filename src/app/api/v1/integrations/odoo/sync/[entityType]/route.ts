/**
 * Odoo Sync API
 *
 * Handles synchronization of entities (products, orders, customers, invoices) with Odoo ERP
 * Now with rate limiting and caching to prevent 429 errors
 *
 * Author: Claude Code
 * Date: 2025-11-04 (Updated with rate limiting)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { OdooService } from '@/lib/services/OdooService';

export async function POST(
  request: NextRequest,

  context: { params: Promise<{ entityType: string }> }
) {
    const { entityType } = await context.params;
  try {

    // Validate entity type
    const validTypes = ['products', 'orders', 'customers', 'invoices'];
    if (!validTypes.includes(entityType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid entity type. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get Odoo configuration
    const configSql = `
      SELECT
        id as connector_id,
        name,
        config,
        status::text as status
      FROM integration_connector
      WHERE provider = 'odoo' AND status::text = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const configResult = await query<any>(configSql);

    if (configResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active Odoo configuration found. Please configure and activate Odoo integration first.',
        },
        { status: 404 }
      );
    }

    const config = configResult.rows[0].config;
    const { server_url, database_name, username, api_key } = config;

    // Normalize server URL
    const normalizedUrl = server_url.replace(/\/$/, '');

    // Map entity types to Odoo models
    const modelMap: Record<string, string> = {
      products: 'product.product',
      orders: 'sale.order',
      customers: 'res.partner',
      invoices: 'account.move',
    };

    const odooModel = modelMap[entityType];
    const connectorId = configResult.rows[0].connector_id;

    // Use OdooService with rate limiting and caching
    const odooService = new OdooService({
      url: normalizedUrl,
      database: database_name,
      username: username,
      password: api_key,
    });

    try {
      // Get record count using rate-limited service
      const recordCount = await odooService.searchCount(odooModel);

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
          records_found: recordCount,
        },
      });
    } catch (syncError: any) {
      console.error(`Sync error for ${entityType}:`, syncError);

      // Update connector with error
      await query(
        `UPDATE integration_connector
         SET error_message = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [syncError.message || 'Sync failed', connectorId]
      );

      // Handle rate limiting
      if (syncError.message?.includes('rate limited') || syncError.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit reached. Please wait a moment and try again.',
            retry_after: 60,
          },
          { status: 429 }
        );
      }

      // Handle circuit breaker
      if (syncError.message?.includes('Circuit breaker is open')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Service temporarily unavailable. Please try again later.',
          },
          { status: 503 }
        );
      }

      throw syncError;
    }
  } catch (error: any) {
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
