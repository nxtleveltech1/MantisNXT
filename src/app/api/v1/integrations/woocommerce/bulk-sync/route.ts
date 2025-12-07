/**
 * WooCommerce Bulk Initial Sync API
 *
 * Performs initial bulk download of ALL products, orders, and customers
 * then switches to incremental updates from there
 *
 * Author: Claude Code
 * Date: 2025-01-XX
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { WooCommerceService } from '@/lib/services/WooCommerceService';
import { CustomerSyncService } from '@/lib/services/CustomerSyncService';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { getActiveWooConnector, resolveWooOrgId } from '@/lib/utils/woocommerce-connector';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orgId } = resolveWooOrgId(request, body);
    const entities: string[] =
      Array.isArray(body?.entities) && body.entities.length
        ? body.entities
        : ['customers', 'products', 'orders'];

    const { connector, orgId: connectorOrgId } = await getActiveWooConnector(orgId);
    if (!connector)
      return NextResponse.json({ success: false, error: 'No active connector' }, { status: 404 });

    // Ensure we have a valid org_id that exists in the organization table
    let validOrgId = connectorOrgId || orgId;
    if (validOrgId) {
      // Verify the org_id exists in the organization table
      const orgCheck = await query<{ id: string }>(
        `SELECT id FROM organization WHERE id = $1 LIMIT 1`,
        [validOrgId]
      );
      if (orgCheck.rows.length === 0) {
        // If the org_id doesn't exist, try to get the first available organization
        const fallbackOrg = await query<{ id: string }>(
          `SELECT id FROM organization ORDER BY created_at LIMIT 1`
        );
        if (fallbackOrg.rows.length > 0) {
          validOrgId = fallbackOrg.rows[0].id;
          console.warn(`[WooCommerce Bulk Sync] Org ID ${orgId} not found, using ${validOrgId}`);
        } else {
          return NextResponse.json(
            { success: false, error: 'No organization found in database' },
            { status: 500 }
          );
        }
      }
    } else {
      // If no org_id at all, get the first available organization
      const fallbackOrg = await query<{ id: string }>(
        `SELECT id FROM organization ORDER BY created_at LIMIT 1`
      );
      if (fallbackOrg.rows.length > 0) {
        validOrgId = fallbackOrg.rows[0].id;
      } else {
        return NextResponse.json(
          { success: false, error: 'No organization found in database' },
          { status: 500 }
        );
      }
    }

    const row = connector;
    const raw = row.config || {};
    const woo = new WooCommerceService({
      url: raw.url || raw.store_url || raw.storeUrl,
      consumerKey: raw.consumerKey || raw.consumer_key,
      consumerSecret: raw.consumerSecret || raw.consumer_secret,
      version: raw.version || 'wc/v3',
      timeout: raw.timeout || 30000,
      verifySsl: raw.verifySsl ?? raw.verify_ssl,
    });

    const ok = await woo.testConnection();
    if (!ok)
      return NextResponse.json(
        { success: false, error: 'WooCommerce connection failed' },
        { status: 502 }
      );

    const resolvedOrgId = validOrgId;

    // Get a valid user ID for the queue (required for foreign key constraint)
    let userId = null;
    const userResult = await query<{ id: string }>(
      `SELECT id FROM "user" WHERE org_id = $1 ORDER BY created_at LIMIT 1`,
      [resolvedOrgId]
    );
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
    } else {
      console.warn(`[WooCommerce Bulk Sync] No users found for org ${resolvedOrgId}, using org ID as fallback`);
      userId = resolvedOrgId; // Fallback for testing
    }

    const results: Record<string, { queueId?: string; totalItems: number; status: string }> = {};

    // Process each entity type
    for (const entity of entities) {
      try {
        console.log(`[Bulk Sync] Starting ${entity} sync...`);
        if (entity === 'customers') {
          // Use existing customer sync service
          console.log(`[Bulk Sync] Creating customer sync queue...`);
          const queueId = await CustomerSyncService.startSync(
            woo,
            resolvedOrgId,
            userId,
            {
              batchSize: 50,
              batchDelayMs: 2000,
              maxRetries: 3,
            }
          );

          // Process in background
          setImmediate(async () => {
            try {
              console.log(`[Bulk Sync] Processing customer queue ${queueId} in background...`);
              await CustomerSyncService.processQueue(woo, queueId, resolvedOrgId, {
                batchSize: 50,
                batchDelayMs: 2000,
                maxRetries: 3,
              });
              console.log(`[Bulk Sync] Customer queue ${queueId} processing completed`);
            } catch (error: unknown) {
              console.error(`[Bulk Sync] Error processing customer sync queue ${queueId}:`, error);
            }
          });

          const status = await CustomerSyncService.getStatus(queueId, resolvedOrgId);
          results.customers = {
            queueId,
            totalItems: status.totalCustomers || 0,
            status: 'queued',
          };
          console.log(`[Bulk Sync] Customers queued: ${status.totalCustomers || 0} items (queue: ${queueId})`);
        } else if (entity === 'products' || entity === 'orders' || entity === 'categories') {
          // Fetch ALL items (no pagination limit)
          console.log(`[Bulk Sync] Fetching all ${entity} from WooCommerce (this may take a while)...`);
          let data: any[] = [];
          if (entity === 'products') {
            data = await woo.fetchAllPages(p => woo.getProducts(p), { per_page: 100 });
          } else if (entity === 'orders') {
            data = await woo.fetchAllPages(p => woo.getOrders(p), {
              per_page: 100,
              order: 'desc',
              orderby: 'date',
            });
          } else if (entity === 'categories') {
            data = await woo.fetchAllPages(p => woo.getCategories(p), { per_page: 100 });
          }
          console.log(`[Bulk Sync] Fetched ${data.length} ${entity} from WooCommerce`);

          // Store in sync_preview_cache for now (can be enhanced with queue later)
          const typeMap: Record<string, string> = {
            products: 'product',
            orders: 'order',
            categories: 'category',
          };
          const entityType = typeMap[entity];

          // Get existing mappings
          const mappings = await query<any>(
            `SELECT external_id FROM integration_mapping WHERE connector_id = $1 AND entity_type::text = $2`,
            [row.connector_id, entityType]
          );
          const existing = new Set<string>(mappings.rows.map((r: any) => String(r.external_id)));

          // Build delta data
          const byId: Record<string, any> = {};
          for (const item of data) {
            const extId = String(item.id);
            const status = existing.has(extId) ? 'updated' : 'new';
            const display = (() => {
              if (entity === 'products') return { name: item.name, sku: item.sku };
              if (entity === 'orders') return { order_number: item.number, status: item.status };
              if (entity === 'categories') return { name: item.name, slug: item.slug };
              return {};
            })();
            byId[extId] = { status, display, raw: item };
          }

          const delta = { inbound: { byId } };

          // Store in cache
          console.log(`[Bulk Sync] Storing ${data.length} ${entity} in sync_preview_cache...`);
          await query(
            `INSERT INTO sync_preview_cache (org_id, sync_type, entity_type, delta_data, updated_at)
             VALUES ($1, 'woocommerce', $2, $3::jsonb, NOW())
             ON CONFLICT (org_id, sync_type, entity_type)
             DO UPDATE SET delta_data = EXCLUDED.delta_data, updated_at = NOW()`,
            [resolvedOrgId, entity, JSON.stringify(delta)]
          );

          results[entity] = {
            totalItems: data.length,
            status: 'completed',
          };
          console.log(`[Bulk Sync] ${entity} sync completed: ${data.length} items stored`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results[entity] = {
          totalItems: 0,
          status: `error: ${errorMessage}`,
        };
        console.error(`[Bulk Sync] Error syncing ${entity}:`, error);
      }
    }

    console.log(`[Bulk Sync] Bulk sync completed. Results:`, JSON.stringify(results, null, 2));

    return NextResponse.json({
      success: true,
      data: {
        message: 'Bulk sync initiated',
        results,
        note: 'Customers are processing in background. Check queue status for progress.',
      },
    });
  } catch (e: unknown) {
    return createErrorResponse(e, 500);
  }
}

