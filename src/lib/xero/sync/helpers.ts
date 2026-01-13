/**
 * Xero Sync Helpers
 * 
 * Shared utility functions for entity mapping and account configuration
 * used across all sync modules.
 */

import { query } from '@/lib/database';
import type { XeroAccountMappingConfig } from '../types';

// ============================================================================
// ENTITY MAPPING FUNCTIONS
// ============================================================================

/**
 * Get Xero entity ID for an NXT entity
 * 
 * @param orgId - Organization ID
 * @param entityType - Type of entity (contact, invoice, item, payment, purchase_order)
 * @param nxtEntityId - NXT entity ID
 * @returns Xero entity ID or null if not found
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
 * 
 * @param orgId - Organization ID
 * @param entityType - Type of entity
 * @param xeroEntityId - Xero entity ID
 * @returns NXT entity ID or null if not found
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
 * Save entity mapping between NXT and Xero
 * 
 * @param orgId - Organization ID
 * @param entityType - Type of entity
 * @param nxtEntityId - NXT entity ID
 * @param xeroEntityId - Xero entity ID
 * @param syncHash - Optional hash for change detection
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
 * 
 * @param orgId - Organization ID
 * @param entityType - Type of entity
 * @param nxtEntityId - NXT entity ID
 * @param errorMessage - Error message to store
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
 * 
 * @param orgId - Organization ID
 * @param entityType - Type of entity
 * @param nxtEntityId - NXT entity ID
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
 * Get account mappings for an organization
 * 
 * @param orgId - Organization ID
 * @returns Partial account mapping configuration
 */
export async function getAccountMappings(
  orgId: string
): Promise<Partial<XeroAccountMappingConfig>> {
  const result = await query<{ 
    mapping_key: string; 
    xero_account_code: string;
    xero_account_id: string;
  }>(
    `SELECT mapping_key, xero_account_code, xero_account_id 
     FROM xero_account_mappings WHERE org_id = $1`,
    [orgId]
  );
  
  const mappings: Partial<XeroAccountMappingConfig> = {};
  for (const row of result.rows) {
    (mappings as Record<string, string>)[row.mapping_key] = row.xero_account_code;
  }
  return mappings;
}

/**
 * Get account mappings with IDs for an organization
 * Returns both account codes and IDs
 * 
 * @param orgId - Organization ID
 * @returns Map of mapping key to { code, id }
 */
export async function getAccountMappingsWithIds(
  orgId: string
): Promise<Record<string, { code: string; id: string }>> {
  const result = await query<{ 
    mapping_key: string; 
    xero_account_code: string;
    xero_account_id: string;
  }>(
    `SELECT mapping_key, xero_account_code, xero_account_id 
     FROM xero_account_mappings WHERE org_id = $1`,
    [orgId]
  );
  
  const mappings: Record<string, { code: string; id: string }> = {};
  for (const row of result.rows) {
    mappings[row.mapping_key] = {
      code: row.xero_account_code,
      id: row.xero_account_id,
    };
  }
  return mappings;
}

/**
 * Get a specific account mapping
 * 
 * @param orgId - Organization ID
 * @param mappingKey - The mapping key (e.g., 'sales_revenue', 'bank_account')
 * @returns Account ID or null
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
