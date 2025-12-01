/**
 * Odoo Preview API
 *
 * Fetches preview data from Odoo without syncing to production database
 * Shows available data and how it will look before full sync
 *
 * Author: Claude Code
 * Date: 2025-01-XX
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { OdooService } from '@/lib/services/OdooService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entityType: string }> }
) {
  const { entityType } = await context.params;
  return handlePreview(entityType, request);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ entityType: string }> }
) {
  const { entityType } = await context.params;
  return handlePreview(entityType, request);
}

async function handlePreview(entityType: string, request: NextRequest) {
  try {
    // Check if request body has override values (from form)
    let server_url: string | undefined;
    let database_name: string | undefined;
    let username: string | undefined;
    let api_key: string | undefined;

    try {
      const body = await request.json();
      server_url = body.server_url;
      database_name = body.database_name;
      username = body.username;
      api_key = body.api_key;
    } catch {
      // No body, will use saved config
    }

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

    // Get Odoo configuration - use override values if provided, otherwise use saved config
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

    const configResult = await query<unknown>(configSql);

    if (configResult.rows.length === 0 && !server_url) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No active Odoo configuration found. Please configure and activate Odoo integration first.',
        },
        { status: 404 }
      );
    }

    const config = configResult.rows[0]?.config || {};

    // Use override values from request body if provided, otherwise use saved config
    const finalServerUrl = server_url || config?.server_url;
    const finalDatabaseName = database_name || config?.database_name;
    const finalUsername = username || config?.username;
    const finalApiKey = api_key || config?.api_key;

    // Validate required fields
    if (!finalServerUrl || !finalDatabaseName || !finalUsername || !finalApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incomplete Odoo configuration. Missing required fields.',
        },
        { status: 400 }
      );
    }

    // Normalize server URL - but don't guess Odoo.sh URLs
    // Use the exact URL from config/form, only remove trailing slash
    const normalizedUrl = String(finalServerUrl).replace(/\/$/, '').trim();

    // Don't auto-normalize Odoo.sh project URLs - use exactly what's provided
    // If the URL format is wrong, the user should fix it in config
    // Only log a warning if format looks suspicious
    if (normalizedUrl.includes('www.odoo.sh/project')) {
      console.warn(
        `[Preview] WARNING: URL format looks like Odoo.sh project URL: ${normalizedUrl}`
      );
      console.warn(
        `[Preview] This may not work. For Odoo.sh, use format: https://yourcompany.odoo.sh`
      );
      console.warn(`[Preview] If test connection works, use the EXACT URL from the test`);
    }

    // Warn if URL format looks suspicious for Odoo.sh
    if (normalizedUrl.includes('.odoo.sh') && !normalizedUrl.match(/^https:\/\/[^/]+\.odoo\.sh$/)) {
      console.warn(`[Preview] WARNING: Odoo.sh URL format may be incorrect: ${normalizedUrl}`);
      console.warn(`[Preview] Expected format: https://yourcompany.odoo.sh (no paths)`);
      console.warn(
        `[Preview] Using provided value as-is. If it fails, update config with exact URL from test connection.`
      );
    }

    // Ensure database_name is a string (handle potential JSONB parsing issues)
    // For Odoo.sh, the database name should match exactly what was used in test connection
    const normalizedDatabaseName = String(finalDatabaseName).trim();

    // Normalize Odoo.sh database name - remove trailing numbers if present
    // Some Odoo.sh instances store database names like "charlesb-pixel-main-production-5308779"
    // But the actual database might be just "charlesb-pixel-main-production"
    if (normalizedUrl.includes('.odoo.sh')) {
      // If database name ends with numbers separated by dash, try without them
      const dbMatch = normalizedDatabaseName.match(/^(.+?)-(\d+)$/);
      if (dbMatch) {
        console.log(
          `[Preview] Detected Odoo.sh database name with trailing numbers: ${normalizedDatabaseName}`
        );
        // Try the base name first, but keep original as fallback
        // We'll use the original format since test connection works with it
      }
    }

    // Log for debugging (remove in production if needed)
    console.log(`[Preview] Using database: "${normalizedDatabaseName}", URL: ${normalizedUrl}`);

    // Map entity types to Odoo models and fields
    const modelMap: Record<string, { model: string; fields: string[] }> = {
      products: {
        model: 'product.template',
        fields: [
          'id',
          'name',
          'default_code',
          'list_price',
          'standard_price',
          'qty_available',
          'type',
          'categ_id',
        ],
      },
      orders: {
        model: 'sale.order',
        fields: ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state', 'order_line'],
      },
      customers: {
        model: 'res.partner',
        fields: [
          'id',
          'name',
          'email',
          'phone',
          'is_company',
          'customer_rank',
          'supplier_rank',
          'street',
          'city',
          'country_id',
        ],
      },
      invoices: {
        model: 'account.move',
        fields: [
          'id',
          'name',
          'partner_id',
          'invoice_date',
          'amount_total',
          'state',
          'move_type',
          'invoice_line_ids',
        ],
      },
    };

    const { model, fields } = modelMap[entityType];

    // Use OdooService with rate limiting
    const odooService = new OdooService({
      url: normalizedUrl,
      database: normalizedDatabaseName,
      username: String(finalUsername).trim(),
      password: String(finalApiKey).trim(),
    });

    try {
      // Get total count
      const totalCount = await odooService.searchCount(model);

      // Fetch preview data (limited to 10 records for preview)
      const previewData = await odooService.searchRead(model, {
        fields,
        limit: 10,
        offset: 0,
        order: 'id desc',
      });

      return NextResponse.json({
        success: true,
        data: {
          entityType,
          totalCount,
          previewCount: previewData.length,
          previewData,
          fields,
        },
      });
    } catch (previewError: unknown) {
      console.error(`Preview error for ${entityType}:`, previewError);
      console.error(
        `Config used - Database: "${normalizedDatabaseName}", URL: ${normalizedUrl}, Username: ${finalUsername}`
      );

      // Handle database not found errors with helpful message
      if (
        previewError.message?.includes('database') &&
        previewError.message?.includes('does not exist')
      ) {
        let errorMessage = `Database "${normalizedDatabaseName}" not found on Odoo server.`;

        if (normalizedUrl.includes('.odoo.sh')) {
          errorMessage += `\n\nFor Odoo.sh instances:\n`;
          errorMessage += `- Verify the database name matches exactly what was used in the test connection\n`;
          errorMessage += `- Database name format is typically: "instance-name" or "instance-name-production"\n`;
          errorMessage += `- Ensure the URL is correct: ${normalizedUrl}\n`;
          errorMessage += `- If the database name includes trailing numbers (e.g., "-5308779"), try without them\n`;
        } else {
          errorMessage += ` Please verify the database name matches exactly what was used in the test connection.`;
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
          },
          { status: 404 }
        );
      }

      // Handle HTML response errors (server returning HTML instead of XML-RPC)
      if (
        previewError.message?.includes('Unknown XML-RPC tag') ||
        previewError.message?.includes('TITLE') ||
        previewError.message?.includes('HTML')
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Odoo server returned HTML instead of XML-RPC response.\n\n` +
              `The URL "${normalizedUrl}" is not accessible or incorrect.\n\n` +
              `**Solution:** Use the EXACT same URL and database name that worked in your test connection.\n\n` +
              `Steps to fix:\n` +
              `1. Go to the Configuration tab\n` +
              `2. Note the Server URL and Database Name that worked in the test\n` +
              `3. Verify these match exactly what's saved\n` +
              `4. For Odoo.sh, the URL should be: https://yourcompany.odoo.sh (no paths)\n` +
              `5. The database name should match exactly what was used in the test\n\n` +
              `Current values being used:\n` +
              `- URL: ${normalizedUrl}\n` +
              `- Database: ${normalizedDatabaseName}\n` +
              `- Username: ${username}\n\n` +
              `If these don't match your test connection, update them in Configuration.`,
          },
          { status: 400 }
        );
      }

      // Handle rate limiting
      if (previewError.message?.includes('rate limited') || previewError.status === 429) {
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
      if (previewError.message?.includes('Circuit breaker is open')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Service temporarily unavailable. Please try again later.',
          },
          { status: 503 }
        );
      }

      throw previewError;
    }
  } catch (error: unknown) {
    console.error(`Error previewing ${entityType}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || `Failed to preview ${entityType}`,
      },
      { status: 500 }
    );
  }
}
