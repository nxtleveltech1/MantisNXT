import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { WooCommerceService } from '@/lib/services/WooCommerceService';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { getActiveWooConnector, resolveWooOrgId } from '@/lib/utils/woocommerce-connector';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orgId } = resolveWooOrgId(request, body);
    const entities: string[] =
      Array.isArray(body?.entities) && body.entities.length
        ? body.entities
        : ['customers', 'products', 'orders', 'categories'];

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
          console.warn(`[WooCommerce Preview] Org ID ${orgId} not found, using ${validOrgId}`);
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

    const results: Record<string, number> = {};
    // For incremental preview: limit to recent items (10 pages = 1000 items max)
    // Use /bulk-sync endpoint for initial full download
    const maxPages = 10;

    // Keep preview payload small but include fields needed for UI display
    const sanitizePreview = (entity: string, item: any) => {
      if (entity === 'products') {
        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          regular_price: item.regular_price,
          sale_price: item.sale_price,
          price: item.price,
          stock_quantity: item.stock_quantity,
          stock_status: item.stock_status,
          categories: item.categories,
          tags: item.tags,
          meta_data: item.meta_data,
          description: item.description,
          short_description: item.short_description,
          type: item.type,
          status: item.status,
          featured: item.featured,
          on_sale: item.on_sale,
          manage_stock: item.manage_stock,
        };
      }

      if (entity === 'customers') {
        return {
          id: item.id,
          email: item.email,
          first_name: item.first_name,
          last_name: item.last_name,
          username: item.username,
          phone: item.billing?.phone,
          billing: item.billing,
          shipping: item.shipping,
          orders_count: item.orders_count,
          total_spent: item.total_spent,
          date_created: item.date_created,
          date_modified: item.date_modified,
        };
      }

      if (entity === 'orders') {
        return {
          id: item.id,
          number: item.number,
          status: item.status,
          total: item.total,
          subtotal: item.total_tax,
          discount_total: item.discount_total,
          shipping_total: item.shipping_total,
          currency: item.currency,
          customer_id: item.customer_id,
          customer_note: item.customer_note,
          billing: item.billing,
          shipping: item.shipping,
          payment_method: item.payment_method,
          payment_method_title: item.payment_method_title,
          date_created: item.date_created,
          date_modified: item.date_modified,
          line_items: item.line_items?.map((li: any) => ({
            id: li.id,
            name: li.name,
            product_id: li.product_id,
            variation_id: li.variation_id,
            quantity: li.quantity,
            total: li.total,
            total_tax: li.total_tax,
            price: li.price,
          })),
          shipping_lines: item.shipping_lines?.map((sl: any) => ({
            id: sl.id,
            method_title: sl.method_title,
            method_id: sl.method_id,
            total: sl.total,
          })),
          fee_lines: item.fee_lines?.map((fl: any) => ({
            id: fl.id,
            name: fl.name,
            total: fl.total,
          })),
        };
      }

      if (entity === 'categories') {
        return {
          id: item.id,
          name: item.name,
          slug: item.slug,
        };
      }

      return {};
    };

    for (const entity of entities) {
      let data: any[] = [];
      if (entity === 'customers') {
        data = await woo.fetchAllPages(
          p => woo.getCustomers(p),
          {
            per_page: 100,
            order: 'desc',
            orderby: 'registered_date',
          },
          { maxPages }
        );
      } else if (entity === 'products') {
        data = await woo.fetchAllPages(p => woo.getProducts(p), { per_page: 100 }, { maxPages });
      } else if (entity === 'orders') {
        data = await woo.fetchAllPages(
          p => woo.getOrders(p),
          {
            per_page: 100,
            order: 'desc',
            orderby: 'date',
          },
          { maxPages }
        );
      } else if (entity === 'categories') {
        data = await woo.fetchAllPages(p => woo.getCategories(p), { per_page: 100 }, { maxPages });
      } else {
        continue;
      }

      const typeMap: Record<string, string> = {
        customers: 'customer',
        products: 'product',
        orders: 'order',
        categories: 'category',
      };
      const entityType = typeMap[entity];

      const mappings = await query<any>(
        `SELECT external_id FROM integration_mapping WHERE connector_id = $1 AND entity_type::text = $2`,
        [row.connector_id, entityType]
      );
      const existing = new Set<string>(mappings.rows.map((r: any) => String(r.external_id)));

      const byId: Record<string, any> = {};
      for (const item of data) {
        const extId = String(item.id);
        const status = existing.has(extId) ? 'updated' : 'new';
        const display = (() => {
          if (entity === 'products') return { name: item.name, sku: item.sku };
          if (entity === 'customers')
            return {
              email: item.email,
              name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
            };
          if (entity === 'orders')
            return {
              order_number: item.number || '',
              status: item.status || '',
              total: `$${item.total || '0'}`,
              customer_email: item.billing?.email || item.shipping?.email || '',
              date: item.date_created || '',
              payment_method: item.payment_method_title || item.payment_method || '',
            };
          if (entity === 'categories') return { name: item.name, slug: item.slug };
          return {};
        })();
        // Store sanitized raw data so preview table can render price/stock/category fields
        const raw = sanitizePreview(entity, item);
        byId[extId] = { status, display, raw };
      }

      const delta = { inbound: { byId } };
      await query(
        `INSERT INTO sync_preview_cache (org_id, sync_type, entity_type, delta_data, updated_at)
         VALUES ($1, 'woocommerce', $2, $3::jsonb, NOW())
         ON CONFLICT (org_id, sync_type, entity_type)
         DO UPDATE SET delta_data = EXCLUDED.delta_data, updated_at = NOW()`,
        [validOrgId, entity, JSON.stringify(delta)]
      );
      results[entity] = data.length;
    }

    return NextResponse.json({ success: true, data: results });
  } catch (e: any) {
    return createErrorResponse(e, 500);
  }
}
