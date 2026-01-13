/**
 * Xero Sync Shared Helpers
 * 
 * Common database operations for entity mapping and account configuration.
 */

import { query } from '@/lib/database';
import type { XeroAccountMappingConfig } from '../types';

// ============================================================================
// ENTITY MAPPING FUNCTIONS
// ============================================================================

/**
 * Get Xero entity ID for an NXT entity
 */
export async function getXeroEntityId(
  orgId: string,
  entityType: string,
  nxtEntityId: string
): Promise<string | null> {
  const result = await query<{ xero_entity_id: string }>(
    `SELECT xero_entity_id FROM xero_entity_mappings
     WHERE org_id = $1 AND entity_type = $2 AND nxt_entity_id = $3
     AND sync_status != 'deleted'`,
    [orgId, entityType, nxtEntityId]
  );
  return result.rows[0]?.xero_entity_id || null;
}

/**
 * Get NXT entity ID for a Xero entity
 */
export async function getNxtEntityId(
  orgId: string,
  entityType: string,
  xeroEntityId: string
): Promise<string | null> {
  const result = await query<{ nxt_entity_id: string }>(
    `SELECT nxt_entity_id FROM xero_entity_mappings
     WHERE org_id = $1 AND entity_type = $2 AND xero_entity_id = $3
     AND sync_status != 'deleted'`,
    [orgId, entityType, xeroEntityId]
  );
  return result.rows[0]?.nxt_entity_id || null;
}

/**
 * Save entity mapping
 */
export async function saveEntityMapping(
  orgId: string,
  entityType: string,
  nxtEntityId: string,
  xeroEntityId: string,
  syncHash?: string
): Promise<void> {
  await query(
    `INSERT INTO xero_entity_mappings (
      org_id, entity_type, nxt_entity_id, xero_entity_id, 
      sync_status, last_synced_at, sync_hash
    ) VALUES ($1, $2, $3, $4, 'synced', NOW(), $5)
    ON CONFLICT (org_id, entity_type, nxt_entity_id)
    DO UPDATE SET
      xero_entity_id = EXCLUDED.xero_entity_id,
      sync_status = 'synced',
      last_synced_at = NOW(),
      sync_hash = EXCLUDED.sync_hash,
      error_message = NULL,
      updated_at = NOW()`,
    [orgId, entityType, nxtEntityId, xeroEntityId, syncHash || null]
  );
}

/**
 * Mark entity mapping as error
 */
export async function markMappingError(
  orgId: string,
  entityType: string,
  nxtEntityId: string,
  errorMessage: string
): Promise<void> {
  await query(
    `UPDATE xero_entity_mappings
     SET sync_status = 'error', error_message = $4, updated_at = NOW()
     WHERE org_id = $1 AND entity_type = $2 AND nxt_entity_id = $3`,
    [orgId, entityType, nxtEntityId, errorMessage]
  );
}

/**
 * Mark entity mapping as deleted
 */
export async function markMappingDeleted(
  orgId: string,
  entityType: string,
  nxtEntityId: string
): Promise<void> {
  await query(
    `UPDATE xero_entity_mappings
     SET sync_status = 'deleted', updated_at = NOW()
     WHERE org_id = $1 AND entity_type = $2 AND nxt_entity_id = $3`,
    [orgId, entityType, nxtEntityId]
  );
}

// ============================================================================
// ACCOUNT MAPPING FUNCTIONS
// ============================================================================

/**
 * Get account mappings (codes only)
 */
export async function getAccountMappings(orgId: string): Promise<Partial<XeroAccountMappingConfig>> {
  const result = await query<{ mapping_key: string; xero_account_code: string }>(
    `SELECT mapping_key, xero_account_code FROM xero_account_mappings WHERE org_id = $1`,
    [orgId]
  );
  
  const mappings: Partial<XeroAccountMappingConfig> = {};
  for (const row of result.rows) {
    (mappings as Record<string, string>)[row.mapping_key] = row.xero_account_code;
  }
  return mappings;
}

/**
 * Get account mappings with IDs (for payment accounts)
 */
export async function getAccountMappingsWithIds(
  orgId: string
): Promise<Record<string, { id: string; code: string; name: string | null }>> {
  const result = await query<{ 
    mapping_key: string; 
    xero_account_id: string; 
    xero_account_code: string;
    xero_account_name: string | null;
  }>(
    `SELECT mapping_key, xero_account_id, xero_account_code, xero_account_name 
     FROM xero_account_mappings WHERE org_id = $1`,
    [orgId]
  );
  
  const mappings: Record<string, { id: string; code: string; name: string | null }> = {};
  for (const row of result.rows) {
    mappings[row.mapping_key] = {
      id: row.xero_account_id,
      code: row.xero_account_code,
      name: row.xero_account_name,
    };
  }
  return mappings;
}

/**
 * Get a specific account ID by mapping key
 */
export async function getAccountId(
  orgId: string,
  mappingKey: string
): Promise<string | null> {
  const result = await query<{ xero_account_id: string }>(
    `SELECT xero_account_id FROM xero_account_mappings 
     WHERE org_id = $1 AND mapping_key = $2`,
    [orgId, mappingKey]
  );
  return result.rows[0]?.xero_account_id || null;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Get all pending entity mappings for sync
 */
export async function getPendingMappings(
  orgId: string,
  entityType?: string,
  limit: number = 100
): Promise<Array<{
  nxtEntityId: string;
  xeroEntityId: string;
  entityType: string;
}>> {
  const conditions = ['org_id = $1', "sync_status = 'pending'"];
  const params: unknown[] = [orgId];
  
  if (entityType) {
    conditions.push('entity_type = $2');
    params.push(entityType);
  }

  const result = await query<{
    nxt_entity_id: string;
    xero_entity_id: string;
    entity_type: string;
  }>(
    `SELECT nxt_entity_id, xero_entity_id, entity_type 
     FROM xero_entity_mappings
     WHERE ${conditions.join(' AND ')}
     ORDER BY updated_at ASC
     LIMIT ${limit}`,
    params
  );

  return result.rows.map(row => ({
    nxtEntityId: row.nxt_entity_id,
    xeroEntityId: row.xero_entity_id,
    entityType: row.entity_type,
  }));
}

/**
 * Bulk update sync status
 */
export async function bulkUpdateSyncStatus(
  orgId: string,
  entityType: string,
  nxtEntityIds: string[],
  status: 'synced' | 'pending' | 'error' | 'deleted',
  errorMessage?: string
): Promise<void> {
  if (nxtEntityIds.length === 0) return;

  await query(
    `UPDATE xero_entity_mappings
     SET sync_status = $3, 
         error_message = $4,
         updated_at = NOW()
     WHERE org_id = $1 
       AND entity_type = $2 
       AND nxt_entity_id = ANY($5::uuid[])`,
    [orgId, entityType, status, errorMessage || null, nxtEntityIds]
  );
}
