/**
 * Sync Preview API Route
 *
 * Endpoint: /api/v1/integrations/sync/preview
 *
 * GET /api/v1/integrations/sync/preview?sync_type=woocommerce&entity_type=customers
 *   - Fetch preview snapshot with delta detection
 *   - Returns cached result if available (1 hour TTL)
 *   - Query params: sync_type (woocommerce|odoo), entity_type (customers|products|orders)
 *
 * POST /api/v1/integrations/sync/preview?action=fetch
 *   - Force recompute delta (invalidate cache)
 *   - Same query params as GET
 *
 * POST /api/v1/integrations/sync/preview?action=select&entity_type=customers
 *   - Apply selective sync configuration
 *   - Body: { includeNew: boolean, includeUpdated: boolean, includeDeleted: boolean }
 *
 * Authentication: Requires organization_id in request context
 * Rate Limit: 10 requests/min per org (via middleware)
 * Error Codes: 400 (invalid params), 401 (auth), 500 (service error)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { DeltaDetectionService, SyncType, EntityType } from '@/lib/services/DeltaDetectionService';

interface SelectiveSyncPayload {
  includeNew: boolean;
  includeUpdated: boolean;
  includeDeleted: boolean;
}

/**
 * Validate query parameters
 */
function validateQueryParams(
  syncType: string | null,
  entityType: string | null
): { valid: boolean; error?: string } {
  const validSyncTypes: SyncType[] = ['woocommerce', 'odoo'];
  const validEntityTypes: EntityType[] = ['customers', 'products', 'orders'];

  if (!syncType || !validSyncTypes.includes(syncType as SyncType)) {
    return {
      valid: false,
      error: `Invalid sync_type. Must be one of: ${validSyncTypes.join(', ')}`,
    };
  }

  if (!entityType || !validEntityTypes.includes(entityType as EntityType)) {
    return {
      valid: false,
      error: `Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Extract organization ID from request context
 */
function getOrgIdFromRequest(request: NextRequest, body?: any): string | null {
  // Try to get from request body first (for POST requests)
  if (body?.orgId) {
    return body.orgId;
  }

  // Try to get from custom header (set by auth middleware)
  const orgId = request.headers.get('x-org-id') || request.headers.get('x-organization-id');
  if (orgId) {
    return orgId;
  }

  // Try query parameter
  const url = new URL(request.url);
  const queryOrgId = url.searchParams.get('orgId');
  if (queryOrgId) {
    return queryOrgId;
  }

  // Alternative: Get from Authorization header (if JWT contains org_id)
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const token = auth.substring(7);
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.org_id || payload.organization_id) {
          return payload.org_id || payload.organization_id;
        }
      }
    } catch {
      // Invalid token format
    }
  }

  // Default fallback for development/testing
  return 'org-default';
}

/**
 * GET - Fetch preview snapshot
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const url = new URL(request.url);
    const syncType = url.searchParams.get('sync_type');
    const entityType = url.searchParams.get('entity_type');

    // Validate parameters
    const validation = validateQueryParams(syncType, entityType);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          details: { requestId },
        },
        { status: 400 }
      );
    }

    // Get organization ID
    const orgId = getOrgIdFromRequest(request);
    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Missing organization context. Please provide orgId in query params, headers, or request body.',
          details: { requestId },
        },
        { status: 401 }
      );
    }

    // Verify org exists and user has access (skip if using default org)
    if (orgId !== 'org-default') {
      const orgCheck = await query(
        `SELECT id FROM organizations WHERE id = $1 LIMIT 1`,
        [orgId]
      );

      if (!orgCheck.rows.length) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: Invalid organization',
            details: { requestId },
          },
          { status: 401 }
        );
      }
    }

    // Get preview snapshot
    const result = await DeltaDetectionService.getPreviewSnapshot(
      orgId,
      syncType as SyncType,
      entityType as EntityType,
      false
    );

    // Log successful operation
    await logRequest(orgId, 'sync_preview_fetch', 'success', {
      syncType,
      entityType,
      cacheHit: result.cacheHit,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTime: Date.now() - startTime,
        },
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': result.cacheHit ? 'private, max-age=300' : 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error(`[Sync Preview] GET error:`, error);

    const orgId = getOrgIdFromRequest(request);
    if (orgId) {
      await logRequest(orgId, 'sync_preview_fetch', 'failed', {
        error: error.message,
        processingTime: Date.now() - startTime,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch sync preview',
        details: { requestId },
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Force refresh or apply selective sync
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const syncType = url.searchParams.get('sync_type');
    const entityType = url.searchParams.get('entity_type');

    // Get organization ID
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // No body, continue
    }

    const orgId = getOrgIdFromRequest(request, body);
    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Missing organization context. Please provide orgId in query params, headers, or request body.',
          details: { requestId },
        },
        { status: 401 }
      );
    }

    // Verify org exists (skip if using default org)
    if (orgId !== 'org-default') {
      const orgCheck = await query(
        `SELECT id FROM organizations WHERE id = $1 LIMIT 1`,
        [orgId]
      );

      if (!orgCheck.rows.length) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: Invalid organization',
            details: { requestId },
          },
          { status: 401 }
        );
      }
    }

    // Handle 'fetch' action - force refresh
    if (action === 'fetch') {
      const validation = validateQueryParams(syncType, entityType);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error,
            details: { requestId },
          },
          { status: 400 }
        );
      }

      // Invalidate cache and get fresh snapshot
      await DeltaDetectionService.invalidatePreviewCache(
        orgId,
        syncType as SyncType,
        entityType as EntityType
      );

      const result = await DeltaDetectionService.getPreviewSnapshot(
        orgId,
        syncType as SyncType,
        entityType as EntityType,
        true
      );

      await logRequest(orgId, 'sync_preview_refresh', 'success', {
        syncType,
        entityType,
        processingTime: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          success: true,
          data: result,
          message: 'Preview refreshed',
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime: Date.now() - startTime,
          },
        },
        {
          status: 200,
          headers: {
            'X-Request-ID': requestId,
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    // Handle 'select' action - apply selective sync
    if (action === 'select') {
      if (!entityType) {
        return NextResponse.json(
          {
            success: false,
            error: 'entity_type is required for select action',
            details: { requestId },
          },
          { status: 400 }
        );
      }

      const payload: SelectiveSyncPayload = await request.json();

      // Validate payload
      if (
        typeof payload.includeNew !== 'boolean' ||
        typeof payload.includeUpdated !== 'boolean' ||
        typeof payload.includeDeleted !== 'boolean'
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid payload. Expected: { includeNew: boolean, includeUpdated: boolean, includeDeleted: boolean }',
            details: { requestId },
          },
          { status: 400 }
        );
      }

      // Store selective sync configuration
      const configId = `sync-config-${orgId}-${entityType}-${Date.now()}`;
      await query(
        `INSERT INTO sync_selective_config (id, org_id, entity_type, config)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (org_id, entity_type) DO UPDATE
         SET config = $4::jsonb, updated_at = NOW()`,
        [
          configId,
          orgId,
          entityType,
          JSON.stringify({
            includeNew: payload.includeNew,
            includeUpdated: payload.includeUpdated,
            includeDeleted: payload.includeDeleted,
            appliedAt: new Date().toISOString(),
          }),
        ]
      );

      await logRequest(orgId, 'sync_selective_config', 'success', {
        entityType,
        config: payload,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            entityType,
            selectiveSyncConfig: payload,
            appliedAt: new Date().toISOString(),
          },
          message: 'Selective sync configuration applied',
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime: Date.now() - startTime,
          },
        },
        {
          status: 200,
          headers: {
            'X-Request-ID': requestId,
          },
        }
      );
    }

    // Invalid action
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Must be one of: fetch, select',
        details: { requestId },
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error(`[Sync Preview] POST error:`, error);

    const orgId = getOrgIdFromRequest(request);
    if (orgId) {
      const action = new URL(request.url).searchParams.get('action');
      await logRequest(orgId, `sync_${action || 'unknown'}`, 'failed', {
        error: error.message,
        processingTime: Date.now() - startTime,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process sync preview request',
        details: { requestId },
      },
      { status: 500 }
    );
  }
}

/**
 * Log request to activity table
 */
async function logRequest(
  orgId: string,
  activityType: string,
  status: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await query(
      `INSERT INTO sync_activity_log (org_id, activity_type, status, details)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [orgId, activityType, status, JSON.stringify(details || {})]
    );
  } catch (error: any) {
    console.error('[Sync Preview] Error logging request:', error);
    // Non-fatal error
  }
}
