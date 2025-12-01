import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { WooCommerceService } from '@/lib/services/WooCommerceService';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get('x-org-id') || '';
    if (!isUuid(orgId))
      return NextResponse.json({ success: false, error: 'orgId required' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const entities: string[] =
      Array.isArray(body?.entities) && body.entities.length
        ? body.entities
        : ['customers', 'products', 'orders', 'categories'];

    const cfg = await query<any>(
      `SELECT id as connector_id, org_id, config
       FROM integration_connector
       WHERE provider = 'woocommerce' AND status::text = 'active' AND org_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [orgId]
    );
    if (!cfg.rows.length)
      return NextResponse.json({ success: false, error: 'No active connector' }, { status: 404 });

    const row = cfg.rows[0];
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

    for (const entity of entities) {
      let data: any[] = [];
      if (entity === 'customers') {
        data = await woo.fetchAllPages(p => woo.getCustomers(p), {
          per_page: 100,
          order: 'desc',
          orderby: 'registered_date',
        });
      } else if (entity === 'products') {
        data = await woo.fetchAllPages(p => woo.getProducts(p), { per_page: 100 });
      } else if (entity === 'orders') {
        data = await woo.fetchAllPages(p => woo.getOrders(p), {
          per_page: 100,
          order: 'desc',
          orderby: 'date',
        });
      } else if (entity === 'categories') {
        data = await woo.fetchAllPages(p => woo.getCategories(p), { per_page: 100 });
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
          if (entity === 'orders') return { order_number: item.number, status: item.status };
          if (entity === 'categories') return { name: item.name, slug: item.slug };
          return {};
        })();
        byId[extId] = { status, display };
      }

      const delta = { inbound: { byId } };
      await query(
        `INSERT INTO sync_preview_cache (org_id, sync_type, entity_type, delta_data, updated_at)
         VALUES ($1, 'woocommerce', $2, $3::jsonb, NOW())
         ON CONFLICT (org_id, sync_type, entity_type)
         DO UPDATE SET delta_data = EXCLUDED.delta_data, updated_at = NOW()`,
        [orgId, entity, JSON.stringify(delta)]
      );
      results[entity] = data.length;
    }

    return NextResponse.json({ success: true, data: results });
  } catch (e: any) {
    return createErrorResponse(e, 500);
  }
}
