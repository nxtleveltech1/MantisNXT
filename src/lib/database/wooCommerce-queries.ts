/**
 * Secure Database Query Interface for WooCommerce Integration
 * Provides parameterized queries with tenant isolation and audit logging
 */

import { query as baseQuery, withTransaction } from '@/lib/database';
import { auditLogger } from '@/lib/logging/audit-logger';
import { securityLogger } from '@/lib/logging/security-logger';
import { InputValidator } from '@/lib/utils/secure-storage';

export interface SecureQueryOptions {
  orgId?: string;
  userId?: string;
  requestId?: string;
  action?: string;
}

/**
 * Secure parameterized query function with tenant isolation
 */
export async function secureQuery<T>(
  text: string,
  params: unknown[] = [],
  options: SecureQueryOptions = {}
): Promise<{ rows: T[]; rowCount: number }> {
  const startTime = Date.now();

  try {
    // Validate and sanitize parameters
    const sanitizedParams = params.map(param => {
      if (typeof param === 'string') {
        return InputValidator.sanitizeInput(param);
      }
      return param;
    });

    // Ensure orgId is always the first parameter for tenant isolation
    if (options.orgId && (!params.length || typeof params[0] !== 'string' || !InputValidator.isValidUUID(params[0] as string))) {
      sanitizedParams.unshift(options.orgId);
    }

    // Execute query with parameterized statements
    const result = await baseQuery<T>(text, sanitizedParams);

    // Audit logging
    await auditLogger.logDatabaseQuery({
      action: options.action || 'QUERY',
      query: text.replace(/\$\d+/g, '?'), // Remove parameter placeholders for logging
      orgId: options.orgId,
      userId: options.userId,
      requestId: options.requestId,
      rowCount: result.rowCount,
      duration: Date.now() - startTime,
      success: true
    });

    return result;

  } catch (error) {
    // Security logging for failed queries
    await securityLogger.logSecurityError({
      error,
      context: {
        type: 'DATABASE_QUERY_ERROR',
        query: text,
        orgId: options.orgId,
        requestId: options.requestId
      }
    });

    throw error;
  }
}

/**
 * Secure transaction wrapper with tenant isolation
 */
export async function secureTransaction<T>(
  callback: (client: any) => Promise<T>,
  options: SecureQueryOptions = {}
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await withTransaction(async (client) => {
      // Audit transaction start
      await auditLogger.logDatabaseQuery({
        action: options.action || 'TRANSACTION_START',
        query: 'BEGIN TRANSACTION',
        orgId: options.orgId,
        userId: options.userId,
        requestId: options.requestId,
        rowCount: 0,
        duration: Date.now() - startTime,
        success: true
      });

      return callback(client);
    });

    // Audit transaction success
    await auditLogger.logDatabaseQuery({
      action: options.action || 'TRANSACTION_COMMIT',
      query: 'COMMIT TRANSACTION',
      orgId: options.orgId,
      userId: options.userId,
      requestId: options.requestId,
      rowCount: 0,
      duration: Date.now() - startTime,
      success: true
    });

    return result;

  } catch (error) {
    // Audit transaction failure
    await auditLogger.logDatabaseQuery({
      action: options.action || 'TRANSACTION_ROLLBACK',
      query: 'ROLLBACK TRANSACTION',
      orgId: options.orgId,
      userId: options.userId,
      requestId: options.requestId,
      rowCount: 0,
      duration: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * WooCommerce-specific query builders with tenant isolation
 */
export const wooCommerceQueries = {
  /**
   * Get active WooCommerce connector for organization
   */
  getActiveConnector: (orgId: string, options: SecureQueryOptions = {}) =>
    secureQuery(
      `SELECT connector_id, name, config, status, org_id, created_at, updated_at
       FROM integration_connectors
       WHERE org_id = $1
         AND integration_type = 'woocommerce'
         AND status = 'active'
         AND deleted_at IS NULL
       LIMIT 1`,
      [orgId],
      { ...options, orgId, action: 'GET_ACTIVE_WOO_CONNECTOR' }
    ),

  /**
   * Get connector by ID with tenant isolation
   */
  getConnectorById: (connectorId: string, orgId: string, options: SecureQueryOptions = {}) =>
    secureQuery(
      `SELECT connector_id, name, config, status, org_id, created_at, updated_at
       FROM integration_connectors
       WHERE connector_id = $1
         AND org_id = $2
         AND integration_type = 'woocommerce'
         AND deleted_at IS NULL`,
      [connectorId, orgId],
      { ...options, orgId, action: 'GET_WOO_CONNECTOR_BY_ID' }
    ),

  /**
   * Update connector configuration securely
   */
  updateConnector: (
    connectorId: string,
    orgId: string,
    updates: Partial<{ name: string; config: any; status: string }>,
    options: SecureQueryOptions = {}
  ) =>
    secureQuery(
      `UPDATE integration_connectors
       SET name = $3, config = $4, status = $5, updated_at = NOW()
       WHERE connector_id = $1
         AND org_id = $2
         AND integration_type = 'woocommerce'
       RETURNING connector_id, name, config, status, org_id, created_at, updated_at`,
      [connectorId, orgId, updates.name, updates.config, updates.status],
      { ...options, orgId, action: 'UPDATE_WOO_CONNECTOR' }
    ),

  /**
   * Insert or update sync preview cache with tenant isolation
   */
  upsertSyncPreviewCache: (
    orgId: string,
    syncType: string,
    entityType: string,
    deltaData: any,
    options: SecureQueryOptions = {}
  ) =>
    secureQuery(
      `INSERT INTO sync_preview_cache (org_id, sync_type, entity_type, delta_data, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (org_id, sync_type, entity_type)
       DO UPDATE SET
         delta_data = EXCLUDED.delta_data,
         updated_at = EXCLUDED.updated_at
       RETURNING cache_id, org_id, sync_type, entity_type, delta_data, updated_at`,
      [orgId, syncType, entityType, JSON.stringify(deltaData)],
      { ...options, orgId, action: 'UPSERT_SYNC_PREVIEW_CACHE' }
    ),

  /**
   * Get sync preview data with tenant isolation
   */
  getSyncPreview: (orgId: string, syncType: string, entityType: string, options: SecureQueryOptions = {}) =>
    secureQuery(
      `SELECT cache_id, delta_data, updated_at
       FROM sync_preview_cache
       WHERE org_id = $1
         AND sync_type::text = $2
         AND entity_type::text = $3
       LIMIT 1`,
      [orgId, syncType, entityType],
      { ...options, orgId, action: 'GET_SYNC_PREVIEW' }
    ),

  /**
   * Get integration mappings with tenant isolation
   */
  getIntegrationMappings: (connectorId: string, orgId: string, entityType: string, options: SecureQueryOptions = {}) =>
    secureQuery(
      `SELECT mapping_id, connector_id, entity_type, external_id, internal_id, sync_status, last_synced_at
       FROM integration_mapping
       WHERE connector_id = $1
         AND org_id = $2
         AND entity_type::text = $3
         AND deleted_at IS NULL`,
      [connectorId, orgId, entityType],
      { ...options, orgId, action: 'GET_INTEGRATION_MAPPINGS' }
    ),

  /**
   * Insert integration mapping with tenant isolation
   */
  insertIntegrationMapping: (
    connectorId: string,
    orgId: string,
    entityType: string,
    externalId: string,
    internalId: string,
    options: SecureQueryOptions = {}
  ) =>
    secureQuery(
      `INSERT INTO integration_mapping (connector_id, org_id, entity_type, external_id, internal_id, sync_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
       ON CONFLICT (connector_id, org_id, entity_type, external_id)
       DO UPDATE SET
         internal_id = EXCLUDED.internal_id,
         sync_status = 'updated',
         updated_at = NOW()
       RETURNING mapping_id, connector_id, org_id, entity_type, external_id, internal_id, sync_status`,
      [connectorId, orgId, entityType, externalId, internalId],
      { ...options, orgId, action: 'INSERT_INTEGRATION_MAPPING' }
    ),

  /**
   * Get WooCommerce sync records with tenant isolation
   */
  getWooCommerceSync: (
    orgId: string,
    entityType: string,
    page: number,
    pageSize: number,
    options: SecureQueryOptions = {}
  ) =>
    secureQuery(
      `SELECT sync_id, org_id, entity_type, external_id, sync_data, last_sync_status, sync_errors, created_at, updated_at
       FROM woocommerce_sync
       WHERE org_id = $1
         AND entity_type::text = $2
       ORDER BY updated_at DESC
       LIMIT $3 OFFSET $4`,
      [orgId, entityType, pageSize, (page - 1) * pageSize],
      { ...options, orgId, action: 'GET_WOOCOMMERCE_SYNC' }
    ),

  /**
   * Insert or update WooCommerce sync record with tenant isolation
   */
  upsertWooCommerceSync: (
    syncData: {
      orgId: string;
      entityType: string;
      externalId: string;
      syncData: any;
      status: string;
      errors?: string;
    },
    options: SecureQueryOptions = {}
  ) =>
    secureQuery(
      `INSERT INTO woocommerce_sync (org_id, entity_type, external_id, sync_data, last_sync_status, sync_errors, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW(), NOW())
       ON CONFLICT (org_id, entity_type, external_id)
       DO UPDATE SET
         sync_data = EXCLUDED.sync_data,
         last_sync_status = EXCLUDED.last_sync_status,
         sync_errors = EXCLUDED.sync_errors,
         updated_at = NOW()
       RETURNING sync_id, org_id, entity_type, external_id, sync_data, last_sync_status, sync_errors`,
      [
        syncData.orgId,
        syncData.entityType,
        syncData.externalId,
        JSON.stringify(syncData.syncData),
        syncData.status,
        syncData.errors || null
      ],
      { ...options, orgId: syncData.orgId, action: 'UPSERT_WOOCOMMERCE_SYNC' }
    ),

  /**
   * Update sync status with tenant isolation
   */
  updateSyncStatus: (
    orgId: string,
    entityType: string,
    externalId: string,
    status: string,
    errors?: string,
    options: SecureQueryOptions = {}
  ) =>
    secureQuery(
      `UPDATE woocommerce_sync
       SET last_sync_status = $4, sync_errors = $5, updated_at = NOW()
       WHERE org_id = $1
         AND entity_type::text = $2
         AND external_id = $3
       RETURNING sync_id, org_id, entity_type, external_id, last_sync_status, sync_errors`,
      [orgId, entityType, externalId, status, errors || null],
      { ...options, orgId, action: 'UPDATE_SYNC_STATUS' }
    ),

  /**
   * Get queue status with tenant isolation
   */
  getQueueStatus: (queueId: string, orgId: string, options: SecureQueryOptions = {}) =>
    secureQuery(
      `SELECT queue_id, org_id, entity_type, status, progress, total_items, processed_items, failed_items, started_at, completed_at, created_at
       FROM woocommerce_sync_queue
       WHERE queue_id = $1
         AND org_id = $2`,
      [queueId, orgId],
      { ...options, orgId, action: 'GET_QUEUE_STATUS' }
    ),

  /**
   * Update queue progress with tenant isolation
   */
  updateQueueProgress: (
    queueId: string,
    orgId: string,
    progress: number,
    processedItems: number,
    failedItems: number,
    options: SecureQueryOptions = {}
  ) =>
    secureQuery(
      `UPDATE woocommerce_sync_queue
       SET progress = $3, processed_items = $4, failed_items = $5, updated_at = NOW()
       WHERE queue_id = $1
         AND org_id = $2
       RETURNING queue_id, org_id, status, progress, processed_items, failed_items`,
      [queueId, orgId, progress, processedItems, failedItems],
      { ...options, orgId, action: 'UPDATE_QUEUE_PROGRESS' }
    ),

  /**
   * Complete queue with tenant isolation
   */
  completeQueue: (
    queueId: string,
    orgId: string,
    totalItems: number,
    processedItems: number,
    failedItems: number,
    options: SecureQueryOptions = {}
  ) =>
    secureQuery(
      `UPDATE woocommerce_sync_queue
       SET status = 'completed',
           progress = 100,
           total_items = $4,
           processed_items = $5,
           failed_items = $6,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE queue_id = $1
         AND org_id = $2
       RETURNING queue_id, org_id, status, progress, total_items, processed_items, failed_items, completed_at`,
      [queueId, orgId, totalItems, processedItems, failedItems],
      { ...options, orgId, action: 'COMPLETE_QUEUE' }
    )
};

/**
 * Pagination helper with tenant isolation
 */
export function buildPaginatedQuery(
  baseQuery: string,
  whereClause: string = '',
  orderBy: string = 'updated_at DESC',
  orgId: string,
  page: number,
  pageSize: number
): { query: string; params: unknown[] } {
  const offset = (page - 1) * pageSize;
  const params: unknown[] = [orgId, pageSize, offset];

  const query = `
    ${baseQuery}
    WHERE org_id = $1
    ${whereClause ? `AND ${whereClause}` : ''}
    ORDER BY ${orderBy}
    LIMIT $2 OFFSET $3
  `;

  return { query, params };
}

/**
 * Bulk operations with tenant isolation
 */
export const wooCommerceBulkQueries = {
  /**
   * Bulk insert integration mappings
   */
  bulkInsertMappings: (
    mappings: Array<{
      connectorId: string;
      orgId: string;
      entityType: string;
      externalId: string;
      internalId: string;
    }>,
    options: SecureQueryOptions = {}
  ) => {
    if (mappings.length === 0) return Promise.resolve({ rows: [], rowCount: 0 });

    const orgId = mappings[0].orgId;
    const values = mappings.map((m, index) => {
      const offset = index * 5;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, NOW(), NOW())`;
    }).join(', ');

    const params = mappings.flatMap(m => [m.connectorId, m.orgId, m.entityType, m.externalId, m.internalId]);

    return secureQuery(
      `INSERT INTO integration_mapping (connector_id, org_id, entity_type, external_id, internal_id, created_at, updated_at)
       VALUES ${values}
       ON CONFLICT (connector_id, org_id, entity_type, external_id)
       DO UPDATE SET
         internal_id = EXCLUDED.internal_id,
         sync_status = 'updated',
         updated_at = NOW()
       RETURNING mapping_id, connector_id, org_id, entity_type, external_id, internal_id`,
      params,
      { ...options, orgId, action: 'BULK_INSERT_MAPPINGS' }
    );
  },

  /**
   * Bulk upsert sync records
   */
  bulkUpsertSync: (
    syncRecords: Array<{
      orgId: string;
      entityType: string;
      externalId: string;
      syncData: any;
      status: string;
    }>,
    options: SecureQueryOptions = {}
  ) => {
    if (syncRecords.length === 0) return Promise.resolve({ rows: [], rowCount: 0 });

    const orgId = syncRecords[0].orgId;
    const values = syncRecords.map((r, index) => {
      const offset = index * 6;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}::jsonb, $${offset + 6}, NOW(), NOW())`;
    }).join(', ');

    const params = syncRecords.flatMap(r => [
      r.orgId,
      r.entityType,
      r.externalId,
      JSON.stringify(r.syncData),
      r.status
    ]);

    return secureQuery(
      `INSERT INTO woocommerce_sync (org_id, entity_type, external_id, sync_data, last_sync_status, created_at, updated_at)
       VALUES ${values}
       ON CONFLICT (org_id, entity_type, external_id)
       DO UPDATE SET
         sync_data = EXCLUDED.sync_data,
         last_sync_status = EXCLUDED.last_sync_status,
         updated_at = NOW()
       RETURNING sync_id, org_id, entity_type, external_id, last_sync_status`,
      params,
      { ...options, orgId, action: 'BULK_UPSERT_SYNC' }
    );
  }
};