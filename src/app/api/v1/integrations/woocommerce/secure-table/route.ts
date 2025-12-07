/**
 * Secure Table API Route
 *
 * Production-grade table data access with comprehensive security:
 * - Authentication & Authorization (admin-only for sensitive data)
 * - Tenant Isolation (org_id validation)
 * - Input Validation & Sanitization
 * - Rate Limiting
 * - Audit Logging
 * - Secure Error Handling
 *
 * Author: Security Team
 * Date: 2025-12-03
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { withSecurity, withAdminSecurity, validateInput } from '@/lib/middleware/security';

// Input validation schema
const validateTableInput = validateInput<TableRequest>((data) => {
  const errors: string[] = [];
  const sanitized = data;

  // Validate entity
  const validEntities = ['products', 'customers', 'orders', 'categories'];
  if (!validEntities.includes(sanitized.entity)) {
    errors.push('Invalid entity. Valid entities: products, customers, orders, categories');
  }

  // Validate pagination parameters
  if (sanitized.page !== undefined && (isNaN(Number(sanitized.page)) || Number(sanitized.page) < 1)) {
    errors.push('Page must be a positive integer');
  }

  if (sanitized.pageSize !== undefined && (isNaN(Number(sanitized.pageSize)) || Number(sanitized.pageSize) < 1 || Number(sanitized.pageSize) > 100)) {
    errors.push('Page size must be between 1 and 100');
  }

  // Validate org_id
  if (!sanitized.orgId) {
    errors.push('orgId is required');
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sanitized.orgId)) {
      errors.push('Invalid organization ID format');
    }
  }

  return { valid: errors.length === 0, errors };
});

interface TableRequest {
  entity: string;
  page?: number;
  pageSize?: number;
  orgId: string;
}

interface TableResponse {
  data: Array<{
    external_id: string;
    status: string;
    display: Record<string, any>;
    raw?: Record<string, any>;
  }>;
  rowCount: number;
  page: number;
  pageSize: number;
  total: number;
}

// GET - Fetch table data (requires admin privileges for sensitive entities)
export const GET = withSecurity(async function GET(request: NextRequest, auth: any) {
  try {
    const url = new URL(request.url);
    const entity = url.searchParams.get('entity') || 'products';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50', 10), 100);
    const orgId = url.searchParams.get('orgId');

    // Validate input
    const validation = validateTableInput({
      entity,
      page,
      pageSize,
      orgId: orgId || auth.orgId,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input format',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const sanitized = validation.sanitized;
    const orgIdValidated = sanitized.orgId;

    // Check if sensitive entity requires admin access
    const sensitiveEntities = ['customers', 'orders'];
    if (sensitiveEntities.includes(entity)) {
      if (!auth.userRole || !['super_admin', 'admin'].includes(auth.userRole)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Admin privileges required to access sensitive data',
          },
          { status: 403 }
        );
      }
    }

    const valid = ['products', 'customers', 'orders', 'categories'];
    if (!valid.includes(entity)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid entity',
        },
        { status: 400 }
      );
    }

    const offset = (page - 1) * pageSize;
    const typeMap: Record<string, string> = {
      products: 'product',
      customers: 'customer',
      orders: 'order',
      categories: 'category',
    };
    const entityType = typeMap[entity];

    // First, try to get data from sync_preview_cache (from bulk sync)
    try {
      const cacheResult = await query<any>(
        `SELECT delta_data, updated_at
         FROM sync_preview_cache
         WHERE org_id = $1
           AND sync_type::text = 'woocommerce'
           AND entity_type::text = $2
         LIMIT 1`,
        [orgIdValidated, entity]
      );

      if (cacheResult.rows.length > 0) {
        // Data exists in cache - extract from delta_data
        const cache = cacheResult.rows[0];
        const delta = cache.delta_data || {};
        const d = delta?.inbound || delta?.bidirectional || delta?.outbound || {};
        const byId = d.byId || {};

        // Convert byId object to array and paginate
        const allItems = Object.entries(byId).map(([external_id, item]: [string, any]) => ({
          external_id,
          status: item.status || 'new',
          display: item.display || {},
          // Don't include raw data for sensitive entities unless admin
          raw: sensitiveEntities.includes(entity) && (!auth.userRole || !['super_admin', 'admin'].includes(auth.userRole))
            ? undefined
            : item.raw || {},
        }));

        // Sort by external_id (or could sort by updated_at if available)
        allItems.sort((a, b) => {
          const aId = parseInt(a.external_id) || 0;
          const bId = parseInt(b.external_id) || 0;
          return bId - aId; // Descending order
        });

        // Paginate
        const paginatedItems = allItems.slice(offset, offset + pageSize);

        return NextResponse.json({
          success: true,
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
        ON p.org_id = s.org_id AND p.sync_type::text = 'woocommerce' AND p.entity_type::text = $2
      WHERE s.entity_type::text = $1
      AND s.org_id = $3
      ORDER BY s.updated_at DESC
      LIMIT $4 OFFSET $5
    `;

    const params: unknown[] = [];
    params.push(entityType, entity, orgIdValidated, pageSize, offset);

    const rows = await query<any>(baseSql, params);

    const data = rows.rows.map((r: any) => {
      const delta = r.delta_data || {};
      const d = delta?.inbound || delta?.bidirectional || delta?.outbound || {};
      const byId = d.byId || {};
      const status = byId?.[r.external_id]?.status || 'in_sync';
      const raw = r.sync_data || {};

      // Don't include raw data for sensitive entities unless admin
      const display = (() => {
        if (entity === 'products') return { name: raw.name, sku: raw.sku };
        if (entity === 'customers')
          return { email: raw.email, name: `${raw.first_name || ''} ${raw.last_name || ''}`.trim() };
        if (entity === 'orders') return { order_number: raw.number, status: raw.status };
        if (entity === 'categories') return { name: raw.name, slug: raw.slug };
        return {};
      })();

      const sanitizedRaw = sensitiveEntities.includes(entity) && (!auth.userRole || !['super_admin', 'admin'].includes(auth.userRole))
        ? undefined
        : raw;

      return {
        external_id: r.external_id,
        status,
        display,
        raw: sanitizedRaw,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      rowCount: rows.rowCount,
      page,
      pageSize,
      total: rows.rowCount,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
});

// POST - Not implemented for table data
export const POST = withSecurity(async function POST(request: NextRequest, auth: any) {
  return createErrorResponse(new Error('Method Not Allowed'), 405);
});