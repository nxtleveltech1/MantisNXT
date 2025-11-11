/**
 * API Endpoint: POST /api/v1/integrations/sync/orchestrate
 *
 * Orchestrates synchronized data syncing across multiple systems
 * (WooCommerce, Odoo, etc.) with conflict resolution and recovery.
 *
 * Actions:
 * - start: Initiate combined sync
 * - status: Get current orchestration status
 * - pause: Pause running sync
 * - resume: Resume paused sync
 * - cancel: Cancel sync gracefully
 *
 * Auth: Requires organization membership
 * Rate Limit: 10 requests/minute per organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { SyncOrchestrator, type System, type EntityType, type SyncConfig } from '@/lib/services/SyncOrchestrator';
import { ConflictResolver } from '@/lib/services/ConflictResolver';
import { v4 as uuidv4 } from 'uuid';
import { getRateLimiter } from '@/lib/utils/rate-limiter';

// In-memory store of active orchestrators (in production, use Redis for multi-instance)
const activeOrchestrators = new Map<string, SyncOrchestrator>();

/**
 * Middleware: Verify authentication and organization membership
 */
async function verifyAuth(request: NextRequest): Promise<{
  userId: string;
  orgId: string;
} | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    // In production, verify JWT token
    // For now, extract from request context
    const userId = request.headers.get('x-user-id');
    const orgId = request.headers.get('x-org-id');

    if (!userId || !orgId) {
      return null;
    }

    // Verify organization membership
    const membership = await query(
      `SELECT role FROM organization_members
       WHERE user_id = $1 AND organization_id = $2`,
      [userId, orgId]
    );

    return membership.rows.length > 0 ? { userId, orgId } : null;
  } catch (error) {
    console.error('[SyncOrchestrate] Auth verification failed:', error);
    return null;
  }
}

/**
 * POST handler for sync orchestration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { orgId } = auth;

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { action } = body;

    // Rate limit by organization
    const rateLimiter = getRateLimiter(`sync:org:${orgId}`, 10, 0.167); // 10/min
    if (!rateLimiter.tryConsume(1)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded (10 requests/minute)' },
        { status: 429 }
      );
    }

    // Route to appropriate action
    switch (action) {
      case 'start':
        return await handleStartSync(request, orgId, body);

      case 'status':
        return await handleGetStatus(request, orgId, body);

      case 'pause':
        return await handlePauseSync(request, orgId, body);

      case 'resume':
        return await handleResumeSync(request, orgId, body);

      case 'cancel':
        return await handleCancelSync(request, orgId, body);

      case 'conflicts':
        return await handleGetConflicts(request, orgId, body);

      case 'resolve-conflict':
        return await handleResolveConflict(request, orgId, body);

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SyncOrchestrate] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Start combined sync
 *
 * Request body:
 * {
 *   "systems": ["woocommerce", "odoo"],
 *   "entityTypes": ["customers", "products"],
 *   "syncConfig": {
 *     "conflictStrategy": "auto-retry",
 *     "batchSize": 50,
 *     "maxRetries": 3,
 *     "rateLimit": 10
 *   }
 * }
 */
async function handleStartSync(
  request: NextRequest,
  orgId: string,
  body: any
): Promise<NextResponse> {
  try {
    // Validate required fields
    if (!body.systems || !Array.isArray(body.systems)) {
      return NextResponse.json(
        { success: false, error: 'systems array required' },
        { status: 400 }
      );
    }

    if (!body.entityTypes || !Array.isArray(body.entityTypes)) {
      return NextResponse.json(
        { success: false, error: 'entityTypes array required' },
        { status: 400 }
      );
    }

    const systems = body.systems as System[];
    const entityTypes = body.entityTypes as EntityType[];

    // Validate systems
    const validSystems = ['woocommerce', 'odoo'];
    for (const system of systems) {
      if (!validSystems.includes(system)) {
        return NextResponse.json(
          { success: false, error: `Invalid system: ${system}` },
          { status: 400 }
        );
      }
    }

    // Validate entity types
    const validEntityTypes = ['customers', 'products', 'orders', 'inventory', 'payments'];
    for (const entityType of entityTypes) {
      if (!validEntityTypes.includes(entityType)) {
        return NextResponse.json(
          { success: false, error: `Invalid entity type: ${entityType}` },
          { status: 400 }
        );
      }
    }

    // Build sync config
    const syncConfig: SyncConfig = {
      conflictStrategy: body.syncConfig?.conflictStrategy || 'auto-retry',
      batchSize: Math.min(body.syncConfig?.batchSize || 50, 200), // Max 200
      maxRetries: Math.min(body.syncConfig?.maxRetries || 3, 5), // Max 5
      rateLimit: Math.min(body.syncConfig?.rateLimit || 10, 50), // Max 50/min
      interBatchDelayMs: body.syncConfig?.interBatchDelayMs || 2000,
    };

    // Verify sync config
    if (syncConfig.batchSize < 1 || syncConfig.maxRetries < 1 || syncConfig.rateLimit < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid sync config values' },
        { status: 400 }
      );
    }

    // Check for duplicate active syncs per org
    const activeSyncs = Array.from(activeOrchestrators.values()).filter(
      o => (o as any).orgId === orgId && (o as any).status === 'processing'
    );

    if (activeSyncs.length >= 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum 5 concurrent syncs per organization' },
        { status: 409 }
      );
    }

    // Create orchestrator
    const orchestrator = new SyncOrchestrator(
      orgId,
      systems,
      entityTypes,
      syncConfig
    );

    // Store reference
    const syncId = (orchestrator as any).syncId;
    activeOrchestrators.set(syncId, orchestrator);

    // Start sync in background (don't await)
    orchestrator
      .orchestrateCombinedSync()
      .then(() => {
        console.log(`[SyncOrchestrate] Sync ${syncId} completed`);
        activeOrchestrators.delete(syncId);
      })
      .catch(error => {
        console.error(`[SyncOrchestrate] Sync ${syncId} failed:`, error);
        activeOrchestrators.delete(syncId);
      });

    return NextResponse.json(
      {
        success: true,
        syncId,
        status: 'queued',
        message: 'Sync orchestration started',
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[SyncOrchestrate] startSync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start sync',
      },
      { status: 500 }
    );
  }
}

/**
 * Get sync status
 *
 * Query params:
 * - syncId: Sync ID to check
 */
async function handleGetStatus(
  request: NextRequest,
  orgId: string,
  body: any
): Promise<NextResponse> {
  try {
    const syncId = body.syncId || request.nextUrl.searchParams.get('syncId');

    if (!syncId) {
      return NextResponse.json(
        { success: false, error: 'syncId required' },
        { status: 400 }
      );
    }

    // Try to find orchestrator in memory first
    const orchestrator = activeOrchestrators.get(syncId);

    if (!orchestrator) {
      // If not in memory, check database for completed syncs
      const syncRecord = await query(
        `SELECT * FROM sync_orchestration WHERE sync_id = $1 AND org_id = $2`,
        [syncId, orgId]
      );

      if (!syncRecord.rows.length) {
        return NextResponse.json(
          { success: false, error: 'Sync not found' },
          { status: 404 }
        );
      }

      // Return database status
      const record = syncRecord.rows[0];

      // Get queue stats
      const wooStats = await query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as processed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
         FROM woo_customer_sync_queue
         WHERE org_id = $1 AND sync_id = $2`,
        [orgId, syncId]
      );

      const odooStats = await query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as processed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
         FROM odoo_sync_queue
         WHERE org_id = $1 AND sync_id = $2`,
        [orgId, syncId]
      );

      const conflictStats = await query(
        `SELECT COUNT(*) as count FROM sync_conflict
         WHERE sync_id = $1 AND is_resolved = false`,
        [syncId]
      );

      return NextResponse.json({
        success: true,
        syncId,
        status: record.status,
        orgId,
        systems: JSON.parse(record.systems),
        entityTypes: JSON.parse(record.entity_types),
        queues: {
          woocommerce: {
            total: parseInt(wooStats.rows[0]?.total || 0),
            processed: parseInt(wooStats.rows[0]?.processed || 0),
            failed: parseInt(wooStats.rows[0]?.failed || 0),
            skipped: parseInt(wooStats.rows[0]?.skipped || 0),
            pending: 0,
          },
          odoo: {
            total: parseInt(odooStats.rows[0]?.total || 0),
            processed: parseInt(odooStats.rows[0]?.processed || 0),
            failed: parseInt(odooStats.rows[0]?.failed || 0),
            skipped: parseInt(odooStats.rows[0]?.skipped || 0),
            pending: 0,
          },
        },
        conflicts: {
          count: parseInt(conflictStats.rows[0]?.count || 0),
          manualReview: [],
        },
        startedAt: record.started_at,
        completedAt: record.completed_at,
      });
    }

    // Get status from active orchestrator
    const status = await orchestrator.getSyncStatus();

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('[SyncOrchestrate] getStatus failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}

/**
 * Pause sync
 */
async function handlePauseSync(
  request: NextRequest,
  orgId: string,
  body: any
): Promise<NextResponse> {
  try {
    const syncId = body.syncId;

    if (!syncId) {
      return NextResponse.json(
        { success: false, error: 'syncId required' },
        { status: 400 }
      );
    }

    const orchestrator = activeOrchestrators.get(syncId);

    if (!orchestrator) {
      return NextResponse.json(
        { success: false, error: 'Sync not found or not running' },
        { status: 404 }
      );
    }

    await orchestrator.pauseSync();

    return NextResponse.json({
      success: true,
      message: 'Sync paused',
      syncId,
    });
  } catch (error) {
    console.error('[SyncOrchestrate] pauseSync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause sync',
      },
      { status: 500 }
    );
  }
}

/**
 * Resume paused sync
 */
async function handleResumeSync(
  request: NextRequest,
  orgId: string,
  body: any
): Promise<NextResponse> {
  try {
    const syncId = body.syncId;

    if (!syncId) {
      return NextResponse.json(
        { success: false, error: 'syncId required' },
        { status: 400 }
      );
    }

    const orchestrator = activeOrchestrators.get(syncId);

    if (!orchestrator) {
      return NextResponse.json(
        { success: false, error: 'Sync not found or not running' },
        { status: 404 }
      );
    }

    await orchestrator.resumeSync();

    return NextResponse.json({
      success: true,
      message: 'Sync resumed',
      syncId,
    });
  } catch (error) {
    console.error('[SyncOrchestrate] resumeSync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume sync',
      },
      { status: 500 }
    );
  }
}

/**
 * Cancel sync gracefully
 */
async function handleCancelSync(
  request: NextRequest,
  orgId: string,
  body: any
): Promise<NextResponse> {
  try {
    const syncId = body.syncId;

    if (!syncId) {
      return NextResponse.json(
        { success: false, error: 'syncId required' },
        { status: 400 }
      );
    }

    const orchestrator = activeOrchestrators.get(syncId);

    if (!orchestrator) {
      return NextResponse.json(
        { success: false, error: 'Sync not found or not running' },
        { status: 404 }
      );
    }

    await orchestrator.cancelSync();
    activeOrchestrators.delete(syncId);

    return NextResponse.json({
      success: true,
      message: 'Sync cancelled',
      syncId,
    });
  } catch (error) {
    console.error('[SyncOrchestrate] cancelSync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel sync',
      },
      { status: 500 }
    );
  }
}

/**
 * Get unresolved conflicts
 */
async function handleGetConflicts(
  request: NextRequest,
  orgId: string,
  body: any
): Promise<NextResponse> {
  try {
    const syncId = body.syncId;

    if (!syncId) {
      return NextResponse.json(
        { success: false, error: 'syncId required' },
        { status: 400 }
      );
    }

    const conflictResolver = new ConflictResolver();
    const conflicts = await conflictResolver.getUnresolvedConflicts(syncId);
    const stats = await conflictResolver.getConflictStats(syncId);

    return NextResponse.json({
      success: true,
      syncId,
      stats,
      conflicts,
    });
  } catch (error) {
    console.error('[SyncOrchestrate] getConflicts failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get conflicts',
      },
      { status: 500 }
    );
  }
}

/**
 * Resolve conflict manually
 */
async function handleResolveConflict(
  request: NextRequest,
  orgId: string,
  body: any
): Promise<NextResponse> {
  try {
    const { conflictId, resolution, customData } = body;

    if (!conflictId || !resolution) {
      return NextResponse.json(
        { success: false, error: 'conflictId and resolution required' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject', 'custom'].includes(resolution)) {
      return NextResponse.json(
        { success: false, error: 'Invalid resolution action' },
        { status: 400 }
      );
    }

    const conflictResolver = new ConflictResolver();
    await conflictResolver.resolveConflictManually(
      conflictId,
      resolution as any,
      customData
    );

    return NextResponse.json({
      success: true,
      message: 'Conflict resolved',
      conflictId,
    });
  } catch (error) {
    console.error('[SyncOrchestrate] resolveConflict failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve conflict',
      },
      { status: 500 }
    );
  }
}
