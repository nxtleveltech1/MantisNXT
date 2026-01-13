/**
 * Xero Quotes Sync
 * 
 * Handles synchronization of Quotations between NXT and Xero.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { mapQuotationToXero, generateSyncHash } from '../mappers';
import { parseXeroApiError } from '../errors';
import { query } from '@/lib/database';
import type { XeroQuote, SyncResult, XeroAccountMappingConfig } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface NxtQuotation {
  id: string;
  customerId: string;
  quoteNumber: string;
  date: Date | string;
  expiryDate?: Date | string;
  title?: string;
  summary?: string;
  terms?: string;
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
// SYNC QUOTE TO XERO
// ============================================================================

/**
 * Sync a quotation to Xero
 */
export async function syncQuoteToXero(
  orgId: string,
  quote: NxtQuotation
): Promise<SyncResult<XeroQuote>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero contact ID for customer
    const xeroContactId = await getXeroEntityId(orgId, 'contact', quote.customerId);
    if (!xeroContactId) {
      throw new Error('Customer not synced to Xero. Sync customer first.');
    }

    // Get account mappings
    const accountMappings = await getAccountMappings(orgId);

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'quote', quote.id);
    
    // Map to Xero format
    const xeroQuote = mapQuotationToXero(quote, xeroContactId, accountMappings);
    if (existingXeroId) {
      xeroQuote.QuoteID = existingXeroId;
    }
    
    const syncHash = generateSyncHash(xeroQuote);

    let result: XeroQuote;
    let action: 'create' | 'update';

    if (existingXeroId) {
      action = 'update';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updateQuote(tenantId, existingXeroId, { quotes: [xeroQuote] });
      });
      result = response.body.quotes?.[0] as XeroQuote;
    } else {
      action = 'create';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createQuotes(tenantId, { quotes: [xeroQuote] });
      });
      result = response.body.quotes?.[0] as XeroQuote;
    }

    if (!result?.QuoteID) {
      throw new Error('No QuoteID returned from Xero');
    }

    await saveEntityMapping(orgId, 'quote', quote.id, result.QuoteID, syncHash);

    await logSyncSuccess(orgId, 'quote', action, 'to_xero', {
      nxtEntityId: quote.id,
      xeroEntityId: result.QuoteID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.QuoteID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'quote', 'create', 'to_xero', parsedError, {
      nxtEntityId: quote.id,
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
// FETCH QUOTES FROM XERO
// ============================================================================

/**
 * Fetch quotes from Xero
 */
export async function fetchQuotesFromXero(
  orgId: string,
  options: {
    status?: string;
    modifiedAfter?: Date;
  } = {}
): Promise<SyncResult<XeroQuote[]>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getQuotes(
        tenantId,
        options.modifiedAfter,
        undefined, // dateFrom
        undefined, // dateTo
        undefined, // expiryDateFrom
        undefined, // expiryDateTo
        undefined, // contactID
        options.status,
        undefined, // page
        undefined  // order
      );
    });

    const quotes = (response.body.quotes || []) as XeroQuote[];

    await logSyncSuccess(orgId, 'quote', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
      recordsProcessed: quotes.length,
    });

    return {
      success: true,
      data: quotes,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'quote', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
