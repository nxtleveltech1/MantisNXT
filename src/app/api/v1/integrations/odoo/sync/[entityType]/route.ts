/**
 * Odoo Sync API
 *
 * Handles synchronization of entities (products, orders, customers, invoices) with Odoo ERP
 *
 * Author: Claude Code
 * Date: 2025-11-02
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { entityType: string } }
) {
  try {
    const entityType = params.entityType;

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

    // Authenticate with Odoo
    const authUrl = `${normalizedUrl}/xmlrpc/2/common`;
    const authPayload = `<?xml version="1.0"?>
<methodCall>
  <methodName>authenticate</methodName>
  <params>
    <param><value><string>${database_name}</string></value></param>
    <param><value><string>${username}</string></value></param>
    <param><value><string>${api_key}</string></value></param>
    <param><value><struct></struct></value></param>
  </params>
</methodCall>`;

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: authPayload,
    });

    if (!authResponse.ok) {
      await query(
        `UPDATE integration_connector
         SET error_message = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [`Odoo authentication failed: ${authResponse.status}`, connectorId]
      );

      return NextResponse.json(
        {
          success: false,
          error: `Failed to authenticate with Odoo: ${authResponse.status} ${authResponse.statusText}`,
        },
        { status: authResponse.status }
      );
    }

    const authResponseText = await authResponse.text();
    const userIdMatch = authResponseText.match(/<int>(\d+)<\/int>/);

    if (!userIdMatch) {
      await query(
        `UPDATE integration_connector
         SET error_message = 'Authentication failed - invalid credentials',
             updated_at = NOW()
         WHERE id = $1`,
        [connectorId]
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed. Please check your credentials.',
        },
        { status: 401 }
      );
    }

    const userId = userIdMatch[1];

    // Search for records using XML-RPC
    const objectUrl = `${normalizedUrl}/xmlrpc/2/object`;
    const searchPayload = `<?xml version="1.0"?>
<methodCall>
  <methodName>execute_kw</methodName>
  <params>
    <param><value><string>${database_name}</string></value></param>
    <param><value><int>${userId}</int></value></param>
    <param><value><string>${api_key}</string></value></param>
    <param><value><string>${odooModel}</string></value></param>
    <param><value><string>search_count</string></value></param>
    <param>
      <value>
        <array>
          <data>
            <value><array><data></data></array></value>
          </data>
        </array>
      </value>
    </param>
  </params>
</methodCall>`;

    const searchResponse = await fetch(objectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: searchPayload,
    });

    if (!searchResponse.ok) {
      await query(
        `UPDATE integration_connector
         SET error_message = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [`Odoo search failed: ${searchResponse.status}`, connectorId]
      );

      return NextResponse.json(
        {
          success: false,
          error: `Failed to search ${entityType} in Odoo: ${searchResponse.status} ${searchResponse.statusText}`,
        },
        { status: searchResponse.status }
      );
    }

    const searchResponseText = await searchResponse.text();
    const countMatch = searchResponseText.match(/<int>(\d+)<\/int>/);
    const recordCount = countMatch ? parseInt(countMatch[1], 10) : 0;

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
  } catch (error: any) {
    console.error(`Error syncing ${params.entityType}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || `Failed to sync ${params.entityType}`,
      },
      { status: 500 }
    );
  }
}
