/**
 * IntegrationMappingService - Handle ID mapping between MantisNXT and external systems
 */

import { query } from '@/lib/database';

export type EntityType = 'product' | 'customer' | 'order' | 'supplier' | 'inventory' | 'category' | 'payment' | 'shipment' | 'invoice' | 'purchase_order';
export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial' | 'conflict';
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';

export interface IntegrationMapping {
  id: string;
  org_id: string;
  connector_id: string;
  entity_type: EntityType;
  internal_id: string;
  external_id: string;
  external_model?: string;
  mapping_data?: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncState {
  id: string;
  org_id: string;
  connector_id: string;
  entity_type: EntityType;
  entity_id: string;
  external_id: string;
  direction: SyncDirection;
  last_sync_at?: string;
  last_sync_status: SyncStatus;
  sync_data?: unknown;
  sync_hash?: string;
  error_message?: string;
  retry_count: number;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
}

export interface CreateMappingParams {
  entityType: EntityType;
  internalId: string;
  externalId: string;
  externalModel?: string;
  mappingData?: unknown;
  syncData?: unknown;
  direction?: SyncDirection;
}

export class IntegrationMappingService {
  constructor(
    private connectorId: string,
    private orgId: string
  ) {}

  /**
   * Create a new mapping between internal and external IDs
   */
  async createMapping(params: CreateMappingParams): Promise<IntegrationMapping> {
    const result = await query<IntegrationMapping>(
      `INSERT INTO integration_mapping (
        org_id, connector_id, entity_type, internal_id, external_id,
        external_model, mapping_data, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        this.orgId,
        this.connectorId,
        params.entityType,
        params.internalId,
        params.externalId,
        params.externalModel || null,
        JSON.stringify(params.mappingData || {}),
        true
      ]
    );

    if (!result.rows.length) {
      throw new Error('Failed to create mapping');
    }

    // Also create sync state record based on integration type
    const tableName = await this.getTableName();
    if (tableName) {
      await this.createSyncState({
        entity_type: params.entityType,
        entity_id: params.internalId,
        external_id: params.externalId,
        direction: params.direction || 'bidirectional',
        sync_data: params.syncData,
      });
    }

    return result.rows[0];
  }

  /**
   * Get mapping by internal ID
   */
  async getMapping(
    entityType: EntityType,
    internalId: string
  ): Promise<IntegrationMapping | null> {
    const result = await query<IntegrationMapping>(
      `SELECT * FROM integration_mapping
       WHERE connector_id = $1 AND entity_type = $2
       AND internal_id = $3 AND is_active = true
       LIMIT 1`,
      [this.connectorId, entityType, internalId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get mapping by external ID
   */
  async getMappingByExternalId(
    entityType: EntityType,
    externalId: string
  ): Promise<IntegrationMapping | null> {
    const result = await query<IntegrationMapping>(
      `SELECT * FROM integration_mapping
       WHERE connector_id = $1 AND entity_type = $2
       AND external_id = $3 AND is_active = true
       LIMIT 1`,
      [this.connectorId, entityType, externalId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update mapping
   */
  async updateMapping(
    id: string,
    updates: Partial<IntegrationMapping>
  ): Promise<IntegrationMapping> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(key === 'mapping_data' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query<IntegrationMapping>(
      `UPDATE integration_mapping
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (!result.rows.length) {
      throw new Error('Failed to update mapping');
    }

    return result.rows[0];
  }

  /**
   * Delete mapping (soft delete by setting is_active to false)
   */
  async deleteMapping(id: string): Promise<void> {
    await query(
      `UPDATE integration_mapping
       SET is_active = false, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  /**
   * Get all mappings for an entity type
   */
  async getMappingsByEntityType(
    entityType: EntityType
  ): Promise<IntegrationMapping[]> {
    const result = await query<IntegrationMapping>(
      `SELECT * FROM integration_mapping
       WHERE connector_id = $1 AND entity_type = $2 AND is_active = true
       ORDER BY created_at DESC`,
      [this.connectorId, entityType]
    );

    return result.rows;
  }

  /**
   * Batch create mappings
   */
  async batchCreateMappings(
    mappings: CreateMappingParams[]
  ): Promise<IntegrationMapping[]> {
    if (mappings.length === 0) return [];

    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    mappings.forEach(mapping => {
      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
      );
      values.push(
        this.orgId,
        this.connectorId,
        mapping.entityType,
        mapping.internalId,
        mapping.externalId,
        mapping.externalModel || null,
        JSON.stringify(mapping.mappingData || {}),
        true
      );
      paramIndex += 8;
    });

    const result = await query<IntegrationMapping>(
      `INSERT INTO integration_mapping (
        org_id, connector_id, entity_type, internal_id, external_id,
        external_model, mapping_data, is_active
      ) VALUES ${placeholders.join(', ')}
      RETURNING *`,
      values
    );

    return result.rows;
  }

  // ==================== Sync State Management ====================

  private async getTableName(): Promise<string | null> {
    // Determine which sync table to use based on connector type
    const result = await query<{ provider: string }>(
      'SELECT provider FROM integration_connector WHERE id = $1',
      [this.connectorId]
    );

    if (!result.rows.length) return null;

    const provider = result.rows[0].provider;
    if (provider === 'woocommerce') return 'woocommerce_sync';
    if (provider === 'odoo') return 'odoo_sync';
    return null;
  }

  /**
   * Create sync state record
   */
  private async createSyncState(params: {
    entity_type: EntityType;
    entity_id: string;
    external_id: string;
    direction: SyncDirection;
    sync_data?: unknown;
    external_model?: string;
  }): Promise<void> {
    const tableName = await this.getTableName();
    if (!tableName) return;

    const columns = [
      'org_id', 'connector_id', 'entity_type', 'entity_id',
      'external_id', 'direction', 'last_sync_status', 'retry_count', 'metadata'
    ];
    const values = [
      this.orgId,
      this.connectorId,
      params.entity_type,
      params.entity_id,
      params.external_id,
      params.direction,
      'pending',
      0,
      JSON.stringify({})
    ];

    let paramIndex = 10;
    if (params.sync_data) {
      columns.push('sync_data');
      values.push(JSON.stringify(params.sync_data));
      paramIndex++;
    }

    if (tableName === 'odoo_sync' && params.external_model) {
      columns.push('odoo_model');
      values.push(params.external_model);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    try {
      await query(
        `INSERT INTO ${tableName} (${columns.join(', ')})
         VALUES (${placeholders})`,
        values
      );
    } catch (error) {
      console.error('Failed to create sync state:', error);
    }
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    entityType: EntityType,
    externalId: string,
    status: SyncStatus,
    syncData?: unknown,
    errorMessage?: string
  ): Promise<void> {
    const tableName = await this.getTableName();
    if (!tableName) return;

    const setClauses = [
      'last_sync_status = $1',
      'last_sync_at = NOW()',
      'updated_at = NOW()'
    ];
    const values: unknown[] = [status];
    let paramIndex = 2;

    if (syncData) {
      setClauses.push(`sync_data = $${paramIndex}`);
      values.push(JSON.stringify(syncData));
      paramIndex++;
    }

    if (errorMessage) {
      setClauses.push(`error_message = $${paramIndex}`);
      values.push(errorMessage);
      paramIndex++;
      setClauses.push(`retry_count = retry_count + 1`);
    }

    values.push(this.connectorId, entityType, externalId);

    try {
      await query(
        `UPDATE ${tableName}
         SET ${setClauses.join(', ')}
         WHERE connector_id = $${paramIndex}
         AND entity_type = $${paramIndex + 1}
         AND external_id = $${paramIndex + 2}`,
        values
      );
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  /**
   * Get sync state
   */
  async getSyncState(
    entityType: EntityType,
    internalId: string
  ): Promise<SyncState | null> {
    const tableName = await this.getTableName();
    if (!tableName) return null;

    const result = await query<SyncState>(
      `SELECT * FROM ${tableName}
       WHERE connector_id = $1 AND entity_type = $2 AND entity_id = $3
       LIMIT 1`,
      [this.connectorId, entityType, internalId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get failed syncs
   */
  async getFailedSyncs(entityType?: EntityType): Promise<SyncState[]> {
    const tableName = await this.getTableName();
    if (!tableName) return [];

    let sql = `SELECT * FROM ${tableName}
               WHERE connector_id = $1 AND last_sync_status = 'failed'`;
    const params: unknown[] = [this.connectorId];

    if (entityType) {
      sql += ' AND entity_type = $2';
      params.push(entityType);
    }

    sql += ' ORDER BY updated_at DESC';

    const result = await query<SyncState>(sql, params);
    return result.rows;
  }

  /**
   * Log sync operation
   */
  async logSync(params: {
    entityType: EntityType;
    entityId?: string;
    externalId?: string;
    direction: SyncDirection;
    status: SyncStatus;
    operation: 'create' | 'update' | 'delete' | 'read' | 'sync';
    recordsAffected?: number;
    errorDetails?: unknown;
    requestPayload?: unknown;
    responsePayload?: unknown;
    durationMs?: number;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO sync_log (
          org_id, connector_id, entity_type, entity_id, external_id,
          sync_direction, sync_status, operation, records_affected,
          error_details, request_payload, response_payload, duration_ms,
          completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          this.orgId,
          this.connectorId,
          params.entityType,
          params.entityId || null,
          params.externalId || null,
          params.direction,
          params.status,
          params.operation,
          params.recordsAffected || 0,
          params.errorDetails ? JSON.stringify(params.errorDetails) : null,
          params.requestPayload ? JSON.stringify(params.requestPayload) : null,
          params.responsePayload ? JSON.stringify(params.responsePayload) : null,
          params.durationMs || null,
          (params.status === 'completed' || params.status === 'failed')
            ? new Date().toISOString()
            : null
        ]
      );
    } catch (error) {
      console.error('Failed to log sync:', error);
    }
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(params: {
    entityType?: EntityType;
    status?: SyncStatus;
    limit?: number;
    offset?: number;
  }): Promise<unknown[]> {
    let sql = `SELECT * FROM sync_log WHERE connector_id = $1`;
    const values: unknown[] = [this.connectorId];
    let paramIndex = 2;

    if (params.entityType) {
      sql += ` AND entity_type = $${paramIndex}`;
      values.push(params.entityType);
      paramIndex++;
    }

    if (params.status) {
      sql += ` AND sync_status = $${paramIndex}`;
      values.push(params.status);
      paramIndex++;
    }

    sql += ' ORDER BY started_at DESC';

    if (params.limit) {
      sql += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
      paramIndex++;
    }

    if (params.offset) {
      sql += ` OFFSET $${paramIndex}`;
      values.push(params.offset);
    }

    const result = await query(sql, values);
    return result.rows;
  }
}