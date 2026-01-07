import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { WooCommerceService } from '@/lib/services/WooCommerceService';
import { IntegrationMappingService } from '@/lib/services/IntegrationMappingService';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { IntegrationSyncService } from '@/lib/services/IntegrationSyncService';
import { getActiveWooConnector, resolveWooOrgId } from '@/lib/utils/woocommerce-connector';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orgId } = resolveWooOrgId(request, body);
    const entity = (body?.entity as string) || 'customers';
    const ids: number[] = Array.isArray(body?.ids)
      ? body.ids.map((v: unknown) => Number(v)).filter(n => Number.isInteger(n))
      : [];

    if (!orgId) {
      return NextResponse.json({ success: false, error: 'orgId required' }, { status: 400 });
    }
    const valid = ['customers', 'products', 'orders'];
    if (!valid.includes(entity)) {
      return NextResponse.json({ success: false, error: 'invalid entity' }, { status: 400 });
    }
    if (!ids.length) {
      return NextResponse.json({ success: false, error: 'ids required' }, { status: 400 });
    }

    const { connector, orgId: connectorOrgId } = await getActiveWooConnector(orgId);
    if (!connector) {
      return NextResponse.json({ success: false, error: 'No active connector' }, { status: 404 });
    }
    const connectorId: string = connector.connector_id;
    const orgIdResolved: string = connectorOrgId || connector.org_id || orgId;
    const raw = connector.config || {};

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

    const mapping = new IntegrationMappingService(connectorId, orgIdResolved);
    let created = 0;
    let updated = 0;
    let failed = 0;
    let materialized = 0;

    for (const id of ids) {
      try {
        if (entity === 'products') {
          const { data: p } = await woo.getProduct(id);
          const existing = await mapping.getMappingByExternalId('product', String(id));
          if (existing) {
            await mapping.updateSyncStatus('product', String(id), 'completed', p);
            updated++;
          } else {
            const sku = (p as any).sku || null;
            const name = (p as any).name || null;
            const price = (p as any).price != null ? Number((p as any).price) : null;
            const description = (p as any).description || null;
            const ins = await query<{ id: string }>(
              `INSERT INTO products (id, sku, name, sale_price, description, is_active, created_at, updated_at)
               VALUES (uuid_generate_v4(), $1, $2, $3, $4, true, NOW(), NOW())
               ON CONFLICT (sku)
               DO UPDATE SET name = EXCLUDED.name, sale_price = EXCLUDED.sale_price, description = EXCLUDED.description, updated_at = NOW()
               RETURNING id`,
              [sku, name, price, description]
            );
            const internalId = ins.rows[0].id;
            const stockQty =
              (p as any).stock_quantity != null ? Number((p as any).stock_quantity) : null;
            if (sku && stockQty != null) {
              await query(
                `INSERT INTO inventory_item (id, org_id, sku, name, quantity_on_hand, is_active, created_at, updated_at)
                 VALUES (uuid_generate_v4(), $1, $2, $3, $4, true, NOW(), NOW())
                 ON CONFLICT (org_id, sku)
                 DO UPDATE SET name = EXCLUDED.name, quantity_on_hand = EXCLUDED.quantity_on_hand, updated_at = NOW()`,
                [orgIdResolved, sku, name, stockQty]
              );
            }
            await mapping.createMapping({
              entityType: 'product',
              internalId,
              externalId: String(id),
              mappingData: { sku },
              syncData: p,
              direction: 'inbound',
            });
            await mapping.logSync({
              entityType: 'product',
              entityId: internalId,
              externalId: String(id),
              direction: 'inbound',
              status: 'completed',
              operation: 'create',
              recordsAffected: 1,
              responsePayload: p,
            });
            created++;
          }
        } else if (entity === 'orders') {
          const { data: o } = await woo.getOrder(id);
          const existing = await mapping.getMappingByExternalId('order', String(id));
          if (existing) {
            await mapping.updateSyncStatus('order', String(id), 'completed', o);
            updated++;
          } else {
            const internalId = String(id);
            await mapping.createMapping({
              entityType: 'order',
              internalId,
              externalId: String(id),
              syncData: o,
              direction: 'inbound',
            });
            await mapping.logSync({
              entityType: 'order',
              externalId: String(id),
              direction: 'inbound',
              status: 'completed',
              operation: 'create',
              recordsAffected: 1,
              responsePayload: o,
            });
            created++;
          }
        } else if (entity === 'customers') {
          const { data: c } = await woo.getCustomer(id);
          const existing = await mapping.getMappingByExternalId('customer', String(id));
          if (existing) {
            await mapping.updateSyncStatus('customer', String(id), 'completed', c);
            updated++;
          } else {
            const ins = await query<{ id: string }>(
              `INSERT INTO customer (id, org_id, name, email, phone, company, segment, status, lifetime_value, acquisition_date, last_interaction_date, address, metadata, tags, created_at, updated_at)
               VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, 'smb', 'active', 0, NOW(), NOW(), '{}'::jsonb, '{}'::jsonb, ARRAY['woocommerce'], NOW(), NOW())
               RETURNING id`,
              [
                orgIdResolved,
                `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
                c.email,
                c.billing?.phone || null,
                c.billing?.company || null,
              ]
            );
            const internalId = ins.rows[0].id;
            await mapping.createMapping({
              entityType: 'customer',
              internalId,
              externalId: String(id),
              syncData: c,
              direction: 'inbound',
            });
            await mapping.logSync({
              entityType: 'customer',
              entityId: internalId,
              externalId: String(id),
              direction: 'inbound',
              status: 'completed',
              operation: 'create',
              recordsAffected: 1,
              responsePayload: c,
            });
            created++;
          }
        }
      } catch (e) {
        failed++;
      }
    }

    if (entity === 'orders') {
      const sync = new IntegrationSyncService(connectorId, orgIdResolved);
      const r = await sync.materializeOrdersFromSync(1000);
      materialized = r.recordsCreated;
    }

    return NextResponse.json({ success: true, data: { created, updated, failed, materialized } });
  } catch (e: any) {
    return createErrorResponse(e, 500);
  }
}
