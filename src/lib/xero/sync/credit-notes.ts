/**
 * Xero Credit Notes Sync
 * 
 * Handles synchronization of Credit Notes between NXT and Xero.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { mapCreditNoteToXero, generateSyncHash } from '../mappers';
import { parseXeroApiError } from '../errors';
import { query } from '@/lib/database';
import type { XeroCreditNote, SyncResult, XeroAccountMappingConfig } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface NxtCreditNote {
  id: string;
  contactId: string;
  creditNoteNumber: string;
  date: Date | string;
  reference?: string;
  type: 'sales' | 'purchase';
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// ============================================================================
// ENTITY MAPPING HELPERS
// ============================================================================

async function getXeroEntityId(
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

async function saveEntityMapping(
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

async function getAccountMappings(orgId: string): Promise<Partial<XeroAccountMappingConfig>> {
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

// ============================================================================
// SYNC CREDIT NOTE TO XERO
// ============================================================================

/**
 * Sync a credit note to Xero
 */
export async function syncCreditNoteToXero(
  orgId: string,
  creditNote: NxtCreditNote
): Promise<SyncResult<XeroCreditNote>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero contact ID
    const xeroContactId = await getXeroEntityId(orgId, 'contact', creditNote.contactId);
    if (!xeroContactId) {
      throw new Error('Contact not synced to Xero. Sync contact first.');
    }

    // Get account mappings
    const accountMappings = await getAccountMappings(orgId);

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'credit_note', creditNote.id);
    
    // Map to Xero format
    const xeroCreditNote = mapCreditNoteToXero(creditNote, xeroContactId, accountMappings);
    if (existingXeroId) {
      xeroCreditNote.CreditNoteID = existingXeroId;
    }
    
    const syncHash = generateSyncHash(xeroCreditNote);

    let result: XeroCreditNote;
    let action: 'create' | 'update';

    if (existingXeroId) {
      action = 'update';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updateCreditNote(tenantId, existingXeroId, { creditNotes: [xeroCreditNote] });
      });
      result = response.body.creditNotes?.[0] as XeroCreditNote;
    } else {
      action = 'create';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createCreditNotes(tenantId, { creditNotes: [xeroCreditNote] });
      });
      result = response.body.creditNotes?.[0] as XeroCreditNote;
    }

    if (!result?.CreditNoteID) {
      throw new Error('No CreditNoteID returned from Xero');
    }

    await saveEntityMapping(orgId, 'credit_note', creditNote.id, result.CreditNoteID, syncHash);

    await logSyncSuccess(orgId, 'credit_note', action, 'to_xero', {
      nxtEntityId: creditNote.id,
      xeroEntityId: result.CreditNoteID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.CreditNoteID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'credit_note', 'create', 'to_xero', parsedError, {
      nxtEntityId: creditNote.id,
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

// ============================================================================
// FETCH CREDIT NOTES FROM XERO
// ============================================================================

/**
 * Fetch credit notes from Xero
 */
export async function fetchCreditNotesFromXero(
  orgId: string,
  options: {
    modifiedAfter?: Date;
  } = {}
): Promise<SyncResult<XeroCreditNote[]>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getCreditNotes(
        tenantId,
        options.modifiedAfter,
        undefined, // where
        undefined, // order
        undefined  // page
      );
    });

    const creditNotes = (response.body.creditNotes || []) as XeroCreditNote[];

    await logSyncSuccess(orgId, 'credit_note', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
      recordsProcessed: creditNotes.length,
    });

    return {
      success: true,
      data: creditNotes,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'credit_note', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
