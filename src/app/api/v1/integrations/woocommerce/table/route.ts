import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getRateLimiter } from '@/lib/utils/rate-limiter';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const entity = url.searchParams.get('entity') || 'products';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50', 10), 100);
  let orgId = url.searchParams.get('orgId') || undefined;
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

  // Ensure the org_id exists in the organization table
  const orgCheck = await query<{ id: string }>(
    `SELECT id FROM organization WHERE id = $1 LIMIT 1`,
    [orgId]
  );
  if (orgCheck.rows.length === 0) {
    // If the org_id doesn't exist, try to get the first available organization
    const fallbackOrg = await query<{ id: string }>(
      `SELECT id FROM organization ORDER BY created_at LIMIT 1`
    );
    if (fallbackOrg.rows.length > 0) {
      orgId = fallbackOrg.rows[0].id;
      console.warn(`[WooCommerce Table] Org ID ${url.searchParams.get('orgId')} not found, using ${orgId}`);
    } else {
      return NextResponse.json(
        { error: 'No organization found in database' },
        { status: 500 }
      );
    }
  }

  const limiter = getRateLimiter(`table:${entity}:org:${orgId}`, 30, 0.5);
  if (!limiter.tryConsume(1)) {
    const res = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    res.headers.set('Retry-After', '30');
    return res;
  }

  const valid = ['products', 'customers', 'orders', 'categories'];
  if (!valid.includes(entity)) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 });
  }

  const offset = (page - 1) * pageSize;
  const typeMap: Record<string, string> = {
    products: 'product',
    customers: 'customer',
    orders: 'order',
    categories: 'category',
  };
  const entityType = typeMap[entity];

  // Helper function to extract meta_data fields
  function extractMetaField(metaData: any[], keys: string[]): string | null {
    if (!Array.isArray(metaData)) return null;
    for (const meta of metaData) {
      if (keys.includes(meta.key)) {
        return String(meta.value || '');
      }
    }
    return null;
  }

  // Helper function to extract product fields from raw data
  function extractProductFields(raw: any) {
    return {
      name: raw.name || '',
      sku: raw.sku || '',
      regular_price: raw.regular_price ? parseFloat(raw.regular_price) : null,
      sale_price: raw.sale_price ? parseFloat(raw.sale_price) : null,
      price: raw.price ? parseFloat(raw.price) : null,
      stock_quantity: raw.stock_quantity !== undefined ? parseInt(raw.stock_quantity) : null,
      stock_status: raw.stock_status || null,
      category_names: raw.categories ? (raw.categories as any[]).map((c: any) => c.name).filter(Boolean).join(', ') : null,
      category_ids: raw.categories ? (raw.categories as any[]).map((c: any) => c.id).filter(Boolean) : [],
      tag_names: raw.tags ? (raw.tags as any[]).map((t: any) => t.name).filter(Boolean).join(', ') : null,
      tag_ids: raw.tags ? (raw.tags as any[]).map((t: any) => t.id).filter(Boolean) : [],
      brand: extractMetaField(raw.meta_data || [], ['_brand', 'brand']),
      description: raw.description || raw.short_description || null,
      type: raw.type || null,
      status: raw.status || null,
      featured: raw.featured || false,
      on_sale: raw.on_sale || false,
      manage_stock: raw.manage_stock || false,
    };
  }

  // First, try to get data from sync_preview_cache (from bulk sync)
  try {
    const cacheResult = await query<any>(
      `SELECT delta_data, updated_at 
       FROM sync_preview_cache 
       WHERE org_id = $1 
         AND sync_type::text = 'woocommerce' 
         AND entity_type::text = $2
       LIMIT 1`,
      [orgId, entity]
    );

    if (cacheResult.rows.length > 0) {
      // Data exists in cache - extract from delta_data
      const cache = cacheResult.rows[0];
      const delta = cache.delta_data || {};
      const d = delta?.inbound || delta?.bidirectional || delta?.outbound || {};
      const byId = d.byId || {};

      // Convert byId object to array and paginate
      const allItems = Object.entries(byId).map(([external_id, item]: [string, any]) => {
        const raw = item.raw || {};
        const productFields = entity === 'products' ? extractProductFields(raw) : {};
        let display = item.display || {};

        if (entity === 'customers') {
          display = {
            email: display.email || raw.email || raw.billing?.email || raw.shipping?.email || '-',
            name: display.name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim(),
          };
        } else if (entity === 'orders') {
          display = {
            order_number: display.order_number || raw.number,
            status: display.status || raw.status,
            total: display.total || raw.total,
            customer_email: display.customer_email || raw.billing?.email,
            date: display.date || raw.date_created,
            payment_method: display.payment_method || raw.payment_method_title || raw.payment_method,
          };
        } else if (entity === 'categories') {
          display = {
            name: display.name || raw.name,
            slug: display.slug || raw.slug,
          };
        }

        return {
          external_id,
          status: item.status || 'new',
          display,
          raw,
          ...productFields,
        };
      });

      // Sort by external_id (or could sort by updated_at if available)
      allItems.sort((a, b) => {
        const aId = parseInt(a.external_id) || 0;
        const bId = parseInt(b.external_id) || 0;
        return bId - aId; // Descending order
      });

      // Paginate
      const paginatedItems = allItems.slice(offset, offset + pageSize);

      return NextResponse.json({
        data: paginatedItems,
        rowCount: allItems.length,
        page,
        pageSize,
        total: allItems.length,
      });
    }
  } catch (cacheError: any) {
    console.error(`[Table] Error reading from sync_preview_cache:`, cacheError);
    // Fall through to legacy query
  }

  // Fallback to woocommerce_sync table (legacy/existing sync)
  const baseSql = `
    SELECT s.external_id,
           s.sync_data,
           s.last_sync_status,
           p.delta_data
    FROM woocommerce_sync s
    LEFT JOIN sync_preview_cache p
      ON p.org_id = s.org_id AND p.sync_type::text = 'woocommerce' AND p.entity_type::text = '${entity}'
    WHERE s.entity_type::text = '${entityType}'
    AND s.org_id = $1
    ORDER BY s.updated_at DESC
    LIMIT $2 OFFSET $3
  `;

  const params: unknown[] = [];
  params.push(orgId);
  params.push(pageSize, offset);

  const rows = await query<any>(baseSql, params);

  const data = rows.rows.map((r: any) => {
    const delta = r.delta_data || {};
    const d = delta?.inbound || delta?.bidirectional || delta?.outbound || {};
    const byId = d.byId || {};
    const status = byId?.[r.external_id]?.status || 'in_sync';
    const raw = r.sync_data || {};
    
    const display = (() => {
      if (entity === 'products') return { name: raw.name, sku: raw.sku };
      if (entity === 'customers')
        return { email: raw.email, name: `${raw.first_name || ''} ${raw.last_name || ''}`.trim() };
      if (entity === 'orders') return { order_number: raw.number, status: raw.status };
      if (entity === 'categories') return { name: raw.name, slug: raw.slug };
      return {};
    })();
    
    const productFields = entity === 'products' ? extractProductFields(raw) : {};
    
    return { external_id: r.external_id, status, display, raw, ...productFields };
  });

  return NextResponse.json({ data, rowCount: rows.rowCount, page, pageSize });
}
export async function POST() {
  return createErrorResponse(new Error('Method Not Allowed'), 405);
}
