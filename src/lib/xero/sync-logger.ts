/**
 * Xero Sync Logger
 * 
 * Comprehensive logging for all Xero synchronization operations.
 * Logs to xero_sync_log table for auditing and debugging.
 */

import { randomUUID } from 'crypto';
import { query } from '@/lib/database';
import type { 
  XeroSyncAction, 
  XeroSyncDirection, 
  XeroSyncLogStatus,
  XeroEntityType,
} from './types';

// ============================================================================
// CORRELATION ID UTILITIES
// ============================================================================

/**
 * Generate a correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Get correlation ID from context or generate new one
 * In a real implementation, this would extract from request headers
 */
export function getCorrelationId(): string {
  // In Next.js App Router, we could use headers() from 'next/headers'
  // For now, generate a new one per operation
  return generateCorrelationId();
}

// ============================================================================
// TYPES
// ============================================================================

export interface SyncLogEntry {
  orgId: string;
  entityType: XeroEntityType | string;
  nxtEntityId?: string;
  xeroEntityId?: string;
  action: XeroSyncAction;
  direction: XeroSyncDirection;
  status: XeroSyncLogStatus;
  errorMessage?: string;
  errorCode?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  recordsProcessed?: number;
  recordsSucceeded?: number;
  recordsFailed?: number;
  durationMs?: number;
  createdBy?: string;
  correlationId?: string;
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Log a sync operation
 */
export async function logSyncOperation(entry: SyncLogEntry): Promise<string> {
  const correlationId = entry.correlationId || generateCorrelationId();
  
  // Enhanced logging with correlation ID
  const logContext = {
    correlationId,
    orgId: entry.orgId,
    entityType: entry.entityType,
    action: entry.action,
    direction: entry.direction,
    status: entry.status,
  };
  
  if (entry.status === 'error') {
    console.error(`[Xero Sync] ${entry.action} ${entry.entityType} failed`, {
      ...logContext,
      error: entry.errorMessage,
      errorCode: entry.errorCode,
      nxtEntityId: entry.nxtEntityId,
      xeroEntityId: entry.xeroEntityId,
    });
  } else {
    console.log(`[Xero Sync] ${entry.action} ${entry.entityType} ${entry.status}`, logContext);
  }
  
  const result = await query<{ id: string }>(
    `INSERT INTO xero_sync_log (
      org_id, entity_type, nxt_entity_id, xero_entity_id,
      action, direction, status, error_message, error_code,
      request_payload, response_payload,
      records_processed, records_succeeded, records_failed,
      duration_ms, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`,
    [
      entry.orgId,
      entry.entityType,
      entry.nxtEntityId || null,
      entry.xeroEntityId || null,
      entry.action,
      entry.direction,
      entry.status,
      entry.errorMessage || null,
      entry.errorCode || null,
      entry.requestPayload ? JSON.stringify(entry.requestPayload) : null,
      entry.responsePayload ? JSON.stringify(entry.responsePayload) : null,
      entry.recordsProcessed || 0,
      entry.recordsSucceeded || 0,
      entry.recordsFailed || 0,
      entry.durationMs || null,
      entry.createdBy || null,
    ]
  );

  return result.rows[0].id;
}

/**
 * Log a successful sync operation
 */
export async function logSyncSuccess(
  orgId: string,
  entityType: XeroEntityType | string,
  action: XeroSyncAction,
  direction: XeroSyncDirection,
  options: {
    nxtEntityId?: string;
    xeroEntityId?: string;
    durationMs?: number;
    recordsProcessed?: number;
    responsePayload?: unknown;
    correlationId?: string;
  } = {}
): Promise<void> {
  await logSyncOperation({
    orgId,
    entityType,
    action,
    direction,
    status: 'success',
    recordsSucceeded: options.recordsProcessed || 1,
    ...options,
  });
}

/**
 * Log a failed sync operation
 */
export async function logSyncError(
  orgId: string,
  entityType: XeroEntityType | string,
  action: XeroSyncAction,
  direction: XeroSyncDirection,
  error: unknown,
  options: {
    nxtEntityId?: string;
    xeroEntityId?: string;
    durationMs?: number;
    requestPayload?: unknown;
    correlationId?: string;
  } = {}
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error && typeof error === 'object' && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;

  await logSyncOperation({
    orgId,
    entityType,
    action,
    direction,
    status: 'error',
    errorMessage,
    errorCode,
    recordsFailed: 1,
    ...options,
  });
}

/**
 * Log a batch sync operation
 */
export async function logBatchSync(
  orgId: string,
  entityType: XeroEntityType | string,
  direction: XeroSyncDirection,
  results: {
    total: number;
    succeeded: number;
    failed: number;
    durationMs: number;
    errors?: Array<{ id: string; error: string }>;
  }
): Promise<void> {
  const status: XeroSyncLogStatus = 
    results.failed === 0 ? 'success' :
    results.succeeded === 0 ? 'error' :
    'partial';

  await logSyncOperation({
    orgId,
    entityType,
    action: 'batch_sync',
    direction,
    status,
    recordsProcessed: results.total,
    recordsSucceeded: results.succeeded,
    recordsFailed: results.failed,
    durationMs: results.durationMs,
    errorMessage: results.errors && results.errors.length > 0
      ? `${results.failed} failures: ${results.errors.slice(0, 3).map(e => e.error).join('; ')}`
      : undefined,
  });
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get recent sync logs for an organization
 */
export async function getRecentSyncLogs(
  orgId: string,
  options: {
    entityType?: string;
    status?: XeroSyncLogStatus;
    limit?: number;
  } = {}
): Promise<Array<{
  id: string;
  entityType: string;
  action: string;
  direction: string;
  status: string;
  errorMessage: string | null;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  createdAt: Date;
}>> {
  const conditions = ['org_id = $1'];
  const params: unknown[] = [orgId];
  let paramIndex = 2;

  if (options.entityType) {
    conditions.push(`entity_type = $${paramIndex++}`);
    params.push(options.entityType);
  }

  if (options.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(options.status);
  }

  const limit = options.limit || 50;

  const result = await query<{
    id: string;
    entity_type: string;
    action: string;
    direction: string;
    status: string;
    error_message: string | null;
    records_processed: number;
    records_succeeded: number;
    records_failed: number;
    created_at: Date;
  }>(
    `SELECT id, entity_type, action, direction, status, error_message,
            records_processed, records_succeeded, records_failed, created_at
     FROM xero_sync_log
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT ${limit}`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    entityType: row.entity_type,
    action: row.action,
    direction: row.direction,
    status: row.status,
    errorMessage: row.error_message,
    recordsProcessed: row.records_processed,
    recordsSucceeded: row.records_succeeded,
    recordsFailed: row.records_failed,
    createdAt: row.created_at,
  }));
}

/**
 * Get sync error summary for an organization
 */
export async function getSyncErrorSummary(
  orgId: string,
  sinceHours: number = 24
): Promise<Array<{
  entityType: string;
  errorCount: number;
  lastError: string | null;
  lastErrorAt: Date;
}>> {
  const result = await query<{
    entity_type: string;
    error_count: string;
    last_error: string | null;
    last_error_at: Date;
  }>(
    `SELECT 
      entity_type,
      COUNT(*) as error_count,
      (array_agg(error_message ORDER BY created_at DESC))[1] as last_error,
      MAX(created_at) as last_error_at
     FROM xero_sync_log
     WHERE org_id = $1
       AND status = 'error'
       AND created_at > NOW() - INTERVAL '${sinceHours} hours'
     GROUP BY entity_type
     ORDER BY error_count DESC`,
    [orgId]
  );

  return result.rows.map(row => ({
    entityType: row.entity_type,
    errorCount: parseInt(row.error_count, 10),
    lastError: row.last_error,
    lastErrorAt: row.last_error_at,
  }));
}

/**
 * Get sync statistics for an organization
 */
export async function getSyncStats(
  orgId: string,
  days: number = 7
): Promise<{
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  byEntityType: Record<string, { total: number; succeeded: number; failed: number }>;
}> {
  const result = await query<{
    entity_type: string;
    status: string;
    count: string;
  }>(
    `SELECT entity_type, status, COUNT(*) as count
     FROM xero_sync_log
     WHERE org_id = $1
       AND created_at > NOW() - INTERVAL '${days} days'
     GROUP BY entity_type, status`,
    [orgId]
  );

  const byEntityType: Record<string, { total: number; succeeded: number; failed: number }> = {};
  let totalOperations = 0;
  let successfulOperations = 0;
  let failedOperations = 0;

  for (const row of result.rows) {
    const count = parseInt(row.count, 10);
    totalOperations += count;

    if (!byEntityType[row.entity_type]) {
      byEntityType[row.entity_type] = { total: 0, succeeded: 0, failed: 0 };
    }

    byEntityType[row.entity_type].total += count;

    if (row.status === 'success') {
      successfulOperations += count;
      byEntityType[row.entity_type].succeeded += count;
    } else if (row.status === 'error') {
      failedOperations += count;
      byEntityType[row.entity_type].failed += count;
    }
  }

  return {
    totalOperations,
    successfulOperations,
    failedOperations,
    successRate: totalOperations > 0 
      ? Math.round((successfulOperations / totalOperations) * 100) 
      : 100,
    byEntityType,
  };
}
