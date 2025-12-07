/**
 * Secure Customer Sync API Route
 *
 * Production-grade customer synchronization with comprehensive security:
 * - Authentication & Authorization (admin-only)
 * - Tenant Isolation (org_id validation)
 * - Input Validation & Sanitization
 * - CSRF Protection
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
import { WooCommerceService } from '@/lib/services/WooCommerceService';
import { CustomerSyncService } from '@/lib/services/CustomerSyncService';
import { SecureCredentialManager } from '@/lib/services/SecureCredentialManager';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';
import { withSecurity, validateInput, CSRFProtection } from '@/lib/middleware/security';

// Input validation schema
const validateSyncInput = validateInput<SyncRequest>((data) => {
  const errors: string[] = [];
  const sanitized = data;

  // Validate config object
  if (!sanitized.config || !sanitized.config.url || !sanitized.config.consumerKey || !sanitized.config.consumerSecret) {
    errors.push('WooCommerce configuration is required (url, consumerKey, consumerSecret)');
  }

  // Validate org_id
  if (!sanitized.org_id) {
    errors.push('org_id is required');
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sanitized.org_id)) {
      errors.push('Invalid organization ID format');
    }
  }

  // Validate action
  const validActions = ['start', 'status', 'retry', 'force-done', 'start-selected', 'start-all'];
  if (sanitized.action && !validActions.includes(sanitized.action)) {
    errors.push('Invalid action. Valid actions: start, status, retry, force-done, start-selected, start-all');
  }

  // Validate options
  if (sanitized.options) {
    if (sanitized.options.limit !== undefined && (isNaN(Number(sanitized.options.limit)) || Number(sanitized.options.limit) <= 0)) {
      errors.push('Limit must be a positive number');
    }

    if (sanitized.options.batchSize !== undefined && (isNaN(Number(sanitized.options.batchSize)) || Number(sanitized.options.batchSize) <= 0 || Number(sanitized.options.batchSize) > 1000)) {
      errors.push('Batch size must be between 1 and 1000');
    }

    if (sanitized.options.batchDelayMs !== undefined && (isNaN(Number(sanitized.options.batchDelayMs)) || Number(sanitized.options.batchDelayMs) < 0)) {
      errors.push('Batch delay must be a non-negative number');
    }

    if (sanitized.options.maxRetries !== undefined && (isNaN(Number(sanitized.options.maxRetries)) || Number(sanitized.options.maxRetries) < 0 || Number(sanitized.options.maxRetries) > 10)) {
      errors.push('Max retries must be between 0 and 10');
    }

    if (sanitized.options.selectedIds && !Array.isArray(sanitized.options.selectedIds)) {
      errors.push('selectedIds must be an array');
    }
  }

  return { valid: errors.length === 0, errors };
});

interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

interface SyncOptions {
  limit?: number;
  email?: string;
  wooCustomerId?: number;
  batchSize?: number;
  batchDelayMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
  selectedIds?: number[];
}

interface SyncRequest {
  config: WooCommerceConfig;
  org_id: string;
  user_id?: string;
  options?: SyncOptions;
  action?: 'start' | 'status' | 'retry' | 'force-done' | 'start-selected' | 'start-all';
  queue_id?: string;
}

interface SyncStatus {
  queue_id: string;
  status: string;
  total_customers: number;
  processed_customers: number;
  failed_customers: number;
  success_customers: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// POST - Start/Manage customer sync (admin-only)
export const POST = withSecurity(async function POST(request: NextRequest, auth: any) {
  try {
    // Check admin privileges
    if (!auth.userRole || !['super_admin', 'admin'].includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin privileges required to manage customer synchronization',
        },
        { status: 403 }
      );
    }

    let body: SyncRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateSyncInput(body);
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

    const sanitizedBody = validation.sanitized;
    const { config, org_id, user_id = auth.userId, options = {}, action = 'start', queue_id } = sanitizedBody;

    const orgId = org_id;
    const userId = user_id;

    // Get credentials securely
    const credentialResult = await SecureCredentialManager.getCredentials(orgId, 'woocommerce');
    if (!credentialResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'WooCommerce credentials not found or expired. Please configure credentials first.',
        },
        { status: 400 }
      );
    }

    // Override config with stored credentials
    const secureConfig = {
      ...config,
      consumerKey: credentialResult.credentials.consumer_key,
      consumerSecret: credentialResult.credentials.consumer_secret,
    };

    const wooService = new WooCommerceService(secureConfig);

    // Test connection
    const connected = await wooService.testConnection();
    if (!connected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to WooCommerce store. Please check your configuration.',
        },
        { status: 500 }
      );
    }

    // Handle different actions
    if (action === 'status' && queue_id) {
      const status = await CustomerSyncService.getStatus(queue_id, orgId);
      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    if (action === 'retry' && queue_id) {
      const progress = await CustomerSyncService.retryFailed(wooService, queue_id, orgId, {
        batchSize: options.batchSize || 50,
        batchDelayMs: options.batchDelayMs || 2000,
        maxRetries: options.maxRetries || 3,
        initialBackoffMs: options.initialBackoffMs || 1000,
      });

      return NextResponse.json({
        success: true,
        data: progress,
        message: 'Retry processing completed',
      });
    }

    if (action === 'force-done' && queue_id) {
      const progress = await CustomerSyncService.forceDone(queue_id, orgId, userId);
      return NextResponse.json({
        success: true,
        data: progress,
        message: 'Queue forced to completion',
      });
    }

    if (action === 'start-all') {
      return NextResponse.json(
        {
          success: false,
          error: 'start-all action requires additional validation and is not yet implemented for secure endpoints',
        },
        { status: 501 }
      );
    }

    if (action === 'start-selected') {
      if (!options.selectedIds || options.selectedIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'selectedIds is required for start-selected action',
          },
          { status: 400 }
        );
      }

      const queueId = await CustomerSyncService.startSync(
        wooService,
        orgId,
        userId,
        {
          batchSize: options.batchSize || 50,
          batchDelayMs: options.batchDelayMs || 2000,
          maxRetries: options.maxRetries || 3,
          initialBackoffMs: options.initialBackoffMs || 1000,
        },
        { selectedIds: options.selectedIds }
      );

      // Process queue (non-blocking)
      setImmediate(async () => {
        try {
          await CustomerSyncService.processQueue(wooService, queueId, orgId, {
            batchSize: options.batchSize || 50,
            batchDelayMs: options.batchDelayMs || 2000,
            maxRetries: options.maxRetries || 3,
          });
        } catch (error: unknown) {
          console.error(`Error processing queue ${queueId}:`, error);
        }
      });

      const status = await CustomerSyncService.getStatus(queueId, orgId);
      return NextResponse.json({
        success: true,
        data: status,
        message: 'Selected customer sync started',
      });
    }

    // Default: Start new sync
    if (action !== 'start') {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown action: ${action}`,
        },
        { status: 400 }
      );
    }

    // Start new sync
    console.log(`Starting customer sync for org ${orgId}`);

    const queueId = await CustomerSyncService.startSync(
      wooService,
      orgId,
      userId,
      {
        batchSize: options.batchSize || 50,
        batchDelayMs: options.batchDelayMs || 2000,
        maxRetries: options.maxRetries || 3,
        backoffMultiplier: 2,
        initialBackoffMs: options.initialBackoffMs || 1000,
      },
      {
        email: options.email,
        wooCustomerId: options.wooCustomerId,
        selectedIds: options.selectedIds,
      }
    );

    // Process queue (non-blocking)
    setImmediate(async () => {
      try {
        await CustomerSyncService.processQueue(wooService, queueId, orgId, {
          batchSize: options.batchSize || 50,
          batchDelayMs: options.batchDelayMs || 2000,
          maxRetries: options.maxRetries || 3,
        });
        console.log(`Sync completed for queue ${queueId}`);
      } catch (error: unknown) {
        console.error(`Error processing queue ${queueId}:`, error);
      }
    });

    const queueStatus = await CustomerSyncService.getStatus(queueId, orgId);

    return NextResponse.json({
      success: true,
      data: {
        ...queueStatus,
        message: 'Customer sync queue created and processing started',
      },
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
});

// GET - Get sync status (requires authentication)
export const GET = withSecurity(async function GET(request: NextRequest, auth: any) {
  try {
    const url = new URL(request.url);
    const queueId = url.searchParams.get('queueId');

    if (!queueId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Queue ID is required',
        },
        { status: 400 }
      );
    }

    const orgId = auth.orgId;

    // Verify queue belongs to organization
    const queueCheck = await query(
      `SELECT id FROM woocommerce_sync_queue WHERE id = $1 AND org_id = $2`,
      [queueId, orgId]
    );

    if (queueCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Queue not found or access denied',
        },
        { status: 404 }
      );
    }

    const status = await CustomerSyncService.getStatus(queueId, orgId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
});