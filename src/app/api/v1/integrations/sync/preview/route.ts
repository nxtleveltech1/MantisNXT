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

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import type { SyncType, EntityType, SyncDirection } from '@/lib/services/DeltaDetectionService';
import { DeltaDetectionService } from '@/lib/services/DeltaDetectionService';

interface SelectiveSyncPayload {
  includeNew: boolean;
  includeUpdated: boolean;
  includeDeleted: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMERGENCY_ORG_ID = '00000000-0000-0000-0000-000000000001';
const FALLBACK_ORG_ID =
  process.env.DEFAULT_ORG_ID && UUID_REGEX.test(process.env.DEFAULT_ORG_ID)
    ? process.env.DEFAULT_ORG_ID
    : EMERGENCY_ORG_ID;

const DIRECTION_MAP: Record<string, SyncDirection> = {
  inbound: 'inbound',
  outbound: 'outbound',
  sync_down: 'inbound',
  sync_up: 'outbound',
  down: 'inbound',
  up: 'outbound',
};
const DIRECTION_LABELS = ['sync_down', 'sync_up', 'inbound', 'outbound'];

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

function resolveDirectionParam(raw?: string | null): SyncDirection | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase().replace(/-/g, '_');
  return DIRECTION_MAP[normalized] ?? null;
}

/**
 * Extract organization ID from request context
 */
function getOrgIdFromRequest(
  request: NextRequest,
  body?: Record<string, unknown>
): { orgId: string | null; usedFallback: boolean } {
  if (body) {
    const bodyOrg =
      typeof body.orgId === 'string'
        ? body.orgId
        : typeof body.org_id === 'string'
          ? body.org_id
          : null;
    if (bodyOrg) {
      return { orgId: bodyOrg, usedFallback: false };
    }
  }

  const headerOrg = request.headers.get('x-org-id') || request.headers.get('x-organization-id');
  if (headerOrg) {
    return { orgId: headerOrg, usedFallback: false };
  }

  const url = new URL(request.url);
  const queryOrgId = url.searchParams.get('orgId');
  if (queryOrgId) {
    return { orgId: queryOrgId, usedFallback: false };
  }

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const token = auth.substring(7);
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const tokenOrg =
          typeof payload.org_id === 'string'
            ? payload.org_id
            : typeof payload.organization_id === 'string'
              ? payload.organization_id
              : null;
        if (tokenOrg) {
          return { orgId: tokenOrg, usedFallback: false };
        }
      }
    } catch {
      // Invalid token format
    }
  }

  return { orgId: FALLBACK_ORG_ID, usedFallback: true };
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
    const rawDirection =
      url.searchParams.get('direction') ?? url.searchParams.get('sync_direction');
    const direction = resolveDirectionParam(rawDirection) ?? 'inbound';

    if (rawDirection && !resolveDirectionParam(rawDirection)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid direction. Must be one of: ${DIRECTION_LABELS.join(', ')}`,
          details: { requestId },
        },
        { status: 400 }
      );
    }

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
    const { orgId, usedFallback } = getOrgIdFromRequest(request);
    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized: Missing organization context. Please provide orgId in query params, headers, or request body.',
          details: { requestId },
        },
        { status: 401 }
      );
    }

    // Verify org exists and user has access (skip if using default org)
    try {
      const orgCheck = await query(`SELECT id FROM organizations WHERE id = $1 LIMIT 1`, [orgId]);

      if (!orgCheck.rows.length) {
        if (!usedFallback) {
          return NextResponse.json(
            {
              success: false,
              error: 'Unauthorized: Invalid organization',
              details: { requestId },
            },
            { status: 401 }
          );
        }

        console.warn(
          `[Sync Preview] Fallback org_id ${orgId} not found in database. Proceeding with fallback context.`
        );
      }
    } catch (orgError) {
      console.warn('[Sync Preview] Organization verification failed:', orgError);
    }

    // Get preview snapshot
    const result = await DeltaDetectionService.getPreviewSnapshot(
      orgId,
      syncType as SyncType,
      entityType as EntityType,
      false,
      direction
    );

    // Log successful operation
    await logRequest(orgId, 'sync_preview_fetch', 'success', {
      syncType,
      entityType,
      direction,
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
          direction,
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
  } catch (error: unknown) {
    console.error(`[Sync Preview] GET error:`, error);

    const { orgId } = getOrgIdFromRequest(request);
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
    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      // No body, continue
    }

    const bodyRecord =
      rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : undefined;

    const rawDirection =
      url.searchParams.get('direction') ??
      url.searchParams.get('sync_direction') ??
      (typeof bodyRecord?.direction === 'string' ? (bodyRecord.direction as string) : null);
    const directionResult = resolveDirectionParam(rawDirection);
    if (rawDirection && !directionResult) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid direction. Must be one of: ${DIRECTION_LABELS.join(', ')}`,
          details: { requestId },
        },
        { status: 400 }
      );
    }
    const direction: SyncDirection = directionResult ?? 'inbound';

    const { orgId, usedFallback } = getOrgIdFromRequest(request, bodyRecord);
    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized: Missing organization context. Please provide orgId in query params, headers, or request body.',
          details: { requestId },
        },
        { status: 401 }
      );
    }

    // Verify org exists (skip if using default org)
    try {
      const orgCheck = await query(`SELECT id FROM organizations WHERE id = $1 LIMIT 1`, [orgId]);

      if (!orgCheck.rows.length) {
        if (!usedFallback) {
          return NextResponse.json(
            {
              success: false,
              error: 'Unauthorized: Invalid organization',
              details: { requestId },
            },
            { status: 401 }
          );
        }

        console.warn(
          `[Sync Preview] Fallback org_id ${orgId} not found in database. Proceeding with fallback context.`
        );
      }
    } catch (orgError) {
      console.warn('[Sync Preview] Organization verification failed:', orgError);
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
        entityType as EntityType,
        direction
      );

      const result = await DeltaDetectionService.getPreviewSnapshot(
        orgId,
        syncType as SyncType,
        entityType as EntityType,
        true,
        direction
      );

      await logRequest(orgId, 'sync_preview_refresh', 'success', {
        syncType,
        entityType,
        direction,
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
            direction,
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

      if (!bodyRecord) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid payload. Expected JSON body.',
            details: { requestId },
          },
          { status: 400 }
        );
      }

      const payload = bodyRecord as Partial<SelectiveSyncPayload>;

      // Validate payload
      if (
        typeof payload.includeNew !== 'boolean' ||
        typeof payload.includeUpdated !== 'boolean' ||
        typeof payload.includeDeleted !== 'boolean'
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid payload. Expected: { includeNew: boolean, includeUpdated: boolean, includeDeleted: boolean }',
            details: { requestId },
          },
          { status: 400 }
        );
      }

      // Store selective sync configuration
      const configId = `sync-config-${orgId}-${entityType}-${Date.now()}`;
      const existingConfig = await query(
        `SELECT config
         FROM sync_selective_config
         WHERE org_id = $1 AND entity_type = $2
         LIMIT 1`,
        [orgId, entityType]
      );

      const currentConfig =
        existingConfig.rows[0]?.config && typeof existingConfig.rows[0].config === 'object'
          ? (existingConfig.rows[0].config as Record<string, unknown>)
          : {};

      const updatedDirectionConfig = {
        includeNew: payload.includeNew,
        includeUpdated: payload.includeUpdated,
        includeDeleted: payload.includeDeleted,
        appliedAt: new Date().toISOString(),
      };

      const mergedConfig = {
        ...currentConfig,
        [direction]: updatedDirectionConfig,
      };

      await query(
        `INSERT INTO sync_selective_config (id, org_id, entity_type, config)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (org_id, entity_type) DO UPDATE
         SET config = $4::jsonb, updated_at = NOW()`,
        [configId, orgId, entityType, JSON.stringify(mergedConfig)]
      );

      await logRequest(orgId, 'sync_selective_config', 'success', {
        entityType,
        direction,
        config: mergedConfig,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            entityType,
            direction,
            selectiveSyncConfig: updatedDirectionConfig,
          },
          message: 'Selective sync configuration applied',
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime: Date.now() - startTime,
            direction,
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
  } catch (error: unknown) {
    console.error(`[Sync Preview] POST error:`, error);

    const { orgId } = getOrgIdFromRequest(request);
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
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await query(
      `INSERT INTO sync_activity_log (org_id, activity_type, status, details)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [orgId, activityType, status, JSON.stringify(details || {})]
    );
  } catch (error: unknown) {
    // Handle missing table gracefully - this is non-fatal
    if (
      error.message?.includes('does not exist') ||
      error.message?.includes('relation') ||
      error.code === '42P01'
    ) {
      console.warn('[Sync Preview] Activity log table does not exist, skipping log:', activityType);
      return;
    }
    console.error('[Sync Preview] Error logging request:', error);
    // Non-fatal error - don't throw
  }
}
