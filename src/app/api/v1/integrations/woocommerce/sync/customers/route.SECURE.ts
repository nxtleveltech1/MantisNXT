/**
 * SECURE IMPLEMENTATION: WooCommerce Customer Sync API
 *
 * This file shows the secure implementation pattern for the sync endpoint.
 * Replace route.ts with this implementation after security review.
 *
 * Security Improvements:
 * - Authentication middleware enforcing JWT validation
 * - Org_id extracted from JWT, not request body
 * - UUID format validation for all parameters
 * - Rate limiting per organization
 * - Credentials never accepted in API request
 * - Error messages don't leak system information
 * - Timeout protection on async operations
 * - Proper permission checks
 *
 * Author: Security Expert Agent
 * Date: 2025-11-06
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { authenticateRequest, authorizeUser, AuthError } from '@/lib/auth/middleware';
import { WooCommerceService } from '@/lib/services/WooCommerceService';
import { CustomerSyncService } from '@/lib/services/CustomerSyncService';
import { WooCommerceSyncQueue } from '@/lib/services/WooCommerceSyncQueue';
import { z } from 'zod';

/**
 * Input Validation Schemas
 * Ensures all parameters are properly formatted and within acceptable ranges
 */
const UUIDSchema = z.string().uuid('Invalid UUID format');

const SyncOptionsSchema = z.object({
  batchSize: z.number().int().min(1).max(1000).optional(),
  batchDelayMs: z.number().int().min(0).max(60000).optional(),
  maxRetries: z.number().int().min(1).max(10).optional(),
  email: z.string().email().optional(),
  wooCustomerId: z.number().int().positive().optional(),
});

const SyncRequestSchema = z.object({
  // org_id will be validated against JWT, not accepted from request
  config: z.object({
    url: z.string().url('Invalid URL format'),
    // Note: consumerKey and consumerSecret must NOT be in request body
    // They will be fetched from secure encrypted storage
  }),
  action: z.enum(['start', 'status', 'retry', 'force-done']).default('start'),
  queue_id: UUIDSchema.optional(),
  options: SyncOptionsSchema.optional(),
});

type SyncRequest = z.infer<typeof SyncRequestSchema>;

/**
 * Rate Limiter (In-memory for MVP, use Redis in production)
 * Tracks requests per organization to prevent DOS attacks
 */
class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs = 60000; // 1 minute
  private readonly maxRequests = 10; // 10 requests per minute

  isAllowed(orgId: string): boolean {
    const now = Date.now();
    const key = `sync:${orgId}`;
    let timestamps = this.requests.get(key) || [];

    // Remove expired timestamps (older than window)
    timestamps = timestamps.filter(t => now - t < this.windowMs);

    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);
    this.requests.set(key, timestamps);

    return true;
  }

  getRemainingRequests(orgId: string): number {
    const now = Date.now();
    const key = `sync:${orgId}`;
    let timestamps = this.requests.get(key) || [];

    timestamps = timestamps.filter(t => now - t < this.windowMs);

    return Math.max(0, this.maxRequests - timestamps.length);
  }

  getResetTime(orgId: string): Date {
    const now = Date.now();
    const key = `sync:${orgId}`;
    const timestamps = this.requests.get(key) || [];

    if (timestamps.length === 0) {
      return new Date(now + this.windowMs);
    }

    const oldestTimestamp = Math.min(...timestamps);
    return new Date(oldestTimestamp + this.windowMs);
  }
}

const rateLimiter = new SimpleRateLimiter();

/**
 * Helper: Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Helper: Get WooCommerce credentials from secure storage
 *
 * In production, these should be:
 * 1. Stored encrypted in database (integrations table)
 * 2. Decrypted using org-specific encryption key
 * 3. Fetched with RLS enforcing org_id isolation
 */
async function getWooCommerceCredentials(
  orgId: string,
  configUrl: string
): Promise<{ url: string; consumerKey: string; consumerSecret: string }> {
  // TODO: Implement actual credential retrieval from secure storage
  // For now, placeholder that shows the pattern:

  /*
  const result = await query(
    `SELECT consumer_key, consumer_secret, url
     FROM integrations
     WHERE org_id = $1
       AND type = 'woocommerce'
       AND url = $2`,
    [orgId, configUrl]
  );

  if (!result.rows.length) {
    throw new Error('WooCommerce integration not found for this organization');
  }

  const { consumer_key, consumer_secret, url } = result.rows[0];

  return {
    url,
    consumerKey: consumer_key,
    consumerSecret: consumer_secret,
  };
  */

  throw new Error('Credential retrieval not yet implemented - see code for pattern');
}

/**
 * POST /api/v1/integrations/woocommerce/sync/customers
 *
 * Secure endpoint for managing customer sync operations
 *
 * Authentication: Required (Bearer JWT)
 * Authorization: Requires 'sync:manage' permission
 * Rate Limit: 10 requests per minute per organization
 *
 * Actions:
 *   - start: Initiate new customer sync
 *   - status: Get status of existing sync queue
 *   - retry: Retry failed items in queue
 *   - force-done: Force complete queue (cancel remaining items)
 */
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // ========================================================================
    // STEP 1: AUTHENTICATION - Verify JWT token
    // ========================================================================
    let authUser;
    try {
      authUser = await authenticateRequest(request);
    } catch (error) {
      if (error instanceof AuthError) {
        console.warn(`[${requestId}] Auth failed: ${error.code}`);
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: error.code,
            requestId,
          },
          { status: error.statusCode }
        );
      }
      throw error;
    }

    // ========================================================================
    // STEP 2: RATE LIMITING - Check per-organization rate limit
    // ========================================================================
    if (!rateLimiter.isAllowed(authUser.organizationId)) {
      const resetTime = rateLimiter.getResetTime(authUser.organizationId);
      console.warn(
        `[${requestId}] Rate limit exceeded for org ${authUser.organizationId}`
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          requestId,
          details: {
            retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000),
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (resetTime.getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // ========================================================================
    // STEP 3: AUTHORIZATION - Check permission
    // ========================================================================
    try {
      await authorizeUser(authUser, 'sync:manage');
    } catch (error) {
      if (error instanceof AuthError) {
        console.warn(
          `[${requestId}] Authorization failed for user ${authUser.userId}`
        );
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: error.code,
            requestId,
          },
          { status: error.statusCode }
        );
      }
      throw error;
    }

    // ========================================================================
    // STEP 4: PARSE & VALIDATE REQUEST BODY
    // ========================================================================
    let body;
    try {
      body = await request.json();
    } catch {
      console.warn(`[${requestId}] Invalid JSON in request body`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
          requestId,
        },
        { status: 400 }
      );
    }

    // Validate against schema
    let validatedBody: SyncRequest;
    try {
      validatedBody = SyncRequestSchema.parse(body);
    } catch (error: unknown) {
      console.warn(`[${requestId}] Validation error: ${error.message}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          requestId,
          details: error.issues?.slice(0, 5) || [], // Only first 5 errors
        },
        { status: 400 }
      );
    }

    // ========================================================================
    // STEP 5: VALIDATE queue_id FORMAT (if provided)
    // ========================================================================
    if (validatedBody.queue_id && !isValidUUID(validatedBody.queue_id)) {
      console.warn(`[${requestId}] Invalid queue_id format`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid queue_id format',
          code: 'INVALID_FORMAT',
          requestId,
        },
        { status: 400 }
      );
    }

    // ========================================================================
    // STEP 6: RETRIEVE CREDENTIALS FROM SECURE STORAGE
    // ========================================================================
    let credentials;
    try {
      credentials = await getWooCommerceCredentials(
        authUser.organizationId,
        validatedBody.config.url
      );
    } catch (error: unknown) {
      console.error(
        `[${requestId}] Failed to retrieve credentials: ${error.message}`
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to retrieve WooCommerce integration',
          code: 'INTEGRATION_NOT_FOUND',
          requestId,
        },
        { status: 404 }
      );
    }

    // ========================================================================
    // STEP 7: TEST CONNECTION TO WOOCOMMERCE
    // ========================================================================
    const wooService = new WooCommerceService(credentials);
    const connected = await wooService.testConnection();

    if (!connected) {
      console.error(
        `[${requestId}] Failed to connect to WooCommerce for org ${authUser.organizationId}`
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to WooCommerce store',
          code: 'CONNECTION_FAILED',
          requestId,
        },
        { status: 500 }
      );
    }

    // ========================================================================
    // STEP 8: HANDLE DIFFERENT ACTIONS
    // ========================================================================
    const action = validatedBody.action || 'start';

    if (action === 'status' && validatedBody.queue_id) {
      // GET STATUS
      const status = await CustomerSyncService.getStatus(validatedBody.queue_id);

      if (!status) {
        return NextResponse.json(
          {
            success: false,
            error: 'Queue not found',
            code: 'NOT_FOUND',
            requestId,
          },
          { status: 404 }
        );
      }

      console.info(`[${requestId}] Status retrieved for queue ${validatedBody.queue_id}`);

      return NextResponse.json({
        success: true,
        data: status,
        requestId,
      });
    }

    if (action === 'retry' && validatedBody.queue_id) {
      // RETRY FAILED ITEMS
      const progress = await CustomerSyncService.retryFailed(
        wooService,
        validatedBody.queue_id,
        authUser.organizationId,
        {
          batchSize: validatedBody.options?.batchSize || 50,
          batchDelayMs: validatedBody.options?.batchDelayMs || 2000,
          maxRetries: validatedBody.options?.maxRetries || 3,
          initialBackoffMs: 1000,
        }
      );

      console.info(
        `[${requestId}] Retry initiated for queue ${validatedBody.queue_id} by user ${authUser.userId}`
      );

      return NextResponse.json({
        success: true,
        data: progress,
        message: 'Retry processing initiated',
        requestId,
      });
    }

    if (action === 'force-done' && validatedBody.queue_id) {
      // FORCE COMPLETE QUEUE
      const progress = await CustomerSyncService.forceDone(validatedBody.queue_id);

      console.warn(
        `[${requestId}] Queue forced to completion by user ${authUser.userId}`
      );

      return NextResponse.json({
        success: true,
        data: progress,
        message: 'Queue forced to completion',
        requestId,
      });
    }

    if (action !== 'start') {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown action: ${action}`,
          code: 'INVALID_ACTION',
          requestId,
        },
        { status: 400 }
      );
    }

    // ========================================================================
    // STEP 9: START NEW SYNC
    // ========================================================================
    console.info(
      `[${requestId}] Starting customer sync for org ${authUser.organizationId} by user ${authUser.userId}`
    );

    const queueId = await CustomerSyncService.startSync(
      wooService,
      authUser.organizationId,  // From JWT
      authUser.userId,           // From JWT
      {
        batchSize: validatedBody.options?.batchSize || 50,
        batchDelayMs: validatedBody.options?.batchDelayMs || 2000,
        maxRetries: Math.min(validatedBody.options?.maxRetries || 3, 10),
        backoffMultiplier: 2,
        initialBackoffMs: 1000,
      },
      {
        email: validatedBody.options?.email,
        wooCustomerId: validatedBody.options?.wooCustomerId,
      }
    );

    // ========================================================================
    // STEP 10: QUEUE ASYNC PROCESSING WITH TIMEOUT
    // ========================================================================
    const SYNC_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    let timeoutHandle: NodeJS.Timeout | null = null;

    Promise.race([
      // Process queue
      CustomerSyncService.processQueue(
        wooService,
        queueId,
        authUser.organizationId,
        {
          batchSize: validatedBody.options?.batchSize || 50,
          batchDelayMs: validatedBody.options?.batchDelayMs || 2000,
          maxRetries: validatedBody.options?.maxRetries || 3,
        }
      ),
      // Timeout
      new Promise((_, reject) =>
        (timeoutHandle = setTimeout(
          () => reject(new Error('Sync operation timeout')),
          SYNC_TIMEOUT_MS
        ))
      ),
    ])
      .then(() => {
        console.info(`[${requestId}] Sync completed for queue ${queueId}`);
      })
      .catch((error) => {
        console.error(
          `[${requestId}] Sync error for queue ${queueId}: ${error.message}`
        );
        // Log error to activity log (not exposing details to client)
        WooCommerceSyncQueue.logActivity(
          queueId,
          null,
          'sync_error',
          'failed',
          'Async processing error',
          { errorCode: error.code || 'UNKNOWN' }
        ).catch(logError =>
          console.error(`[${requestId}] Failed to log sync error: ${logError.message}`)
        );
      })
      .finally(() => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      });

    // ========================================================================
    // STEP 11: RETURN INITIAL RESPONSE
    // ========================================================================
    const queueStatus = await CustomerSyncService.getStatus(queueId);
    const { queueId: _statusQueueId, ...queueStatusData } = queueStatus ?? {};

    console.info(`[${requestId}] Sync queue created: ${queueId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          queueId,
          ...queueStatusData,
          message: 'Sync queue created and processing started',
        },
        requestId,
      },
      {
        status: 202, // Accepted - processing will happen asynchronously
        headers: {
          'X-RateLimit-Remaining': rateLimiter
            .getRemainingRequests(authUser.organizationId)
            .toString(),
          'X-RateLimit-Reset': rateLimiter
            .getResetTime(authUser.organizationId)
            .toISOString(),
        },
      }
    );

  } catch (error: unknown) {
    console.error(`[${requestId}] Unhandled error:`, {
      message: error.message,
      code: error.code,
      // Don't log stack trace to prevent info leakage
    });

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred processing your request',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}
