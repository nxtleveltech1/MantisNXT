/**
 * Xero Items Sync
 * 
 * Handles synchronization of Products between NXT and Xero Items.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError, logBatchSync } from '../sync-logger';
import { mapProductToXeroItem, generateSyncHash } from '../mappers';
import { parseXeroApiError } from '../errors';
import { 
  getXeroEntityId, 
  saveEntityMapping, 
  getAccountMappings 
} from './helpers';
import type { XeroItem, SyncResult, BatchSyncResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface NxtProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  baseCost?: number;
  salePrice?: number;
  isTracked?: boolean;
}

// ============================================================================
// SYNC PRODUCT TO XERO
// ============================================================================

/**
 * Sync a single product to Xero as an Item
 */
export async function syncProductToXero(
  orgId: string,
  product: NxtProduct
): Promise<SyncResult<XeroItem>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get account mappings
    const accountMappings = await getAccountMappings(orgId);

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'item', product.id);
    
    // Map to Xero format
    const xeroItem = mapProductToXeroItem(product, accountMappings, existingXeroId || undefined);
    const syncHash = generateSyncHash(xeroItem);

    let result: XeroItem;
    let action: 'create' | 'update';

    if (existingXeroId) {
      action = 'update';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updateItem(tenantId, existingXeroId, { items: [xeroItem] });
      });
      result = response.body.items?.[0] as XeroItem;
    } else {
      action = 'create';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createItems(tenantId, { items: [xeroItem] });
      });
      result = response.body.items?.[0] as XeroItem;
    }

    if (!result?.ItemID) {
      throw new Error('No ItemID returned from Xero');
    }

    await saveEntityMapping(orgId, 'item', product.id, result.ItemID, syncHash);

    await logSyncSuccess(orgId, 'item', action, 'to_xero', {
      nxtEntityId: product.id,
      xeroEntityId: result.ItemID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.ItemID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'item', 'create', 'to_xero', parsedError, {
      nxtEntityId: product.id,
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

/**
 * Batch sync multiple products to Xero
 */
export async function syncProductsToXero(
  orgId: string,
  products: NxtProduct[]
): Promise<BatchSyncResult> {
  const startTime = Date.now();
  const results: BatchSyncResult = {
    total: products.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const product of products) {
    const result = await syncProductToXero(orgId, product);
    
    if (result.success) {
      results.succeeded++;
    } else {
      results.failed++;
      results.errors.push({
        nxtEntityId: product.id,
        error: result.error || 'Unknown error',
      });
    }
  }

  await logBatchSync(orgId, 'item', 'to_xero', {
    total: results.total,
    succeeded: results.succeeded,
    failed: results.failed,
    durationMs: Date.now() - startTime,
    errors: results.errors,
  });

  return results;
}

// ============================================================================
// FETCH ITEMS FROM XERO
// ============================================================================

/**
 * Fetch all items from Xero
 */
export async function fetchItemsFromXero(
  orgId: string,
  options: {
    modifiedAfter?: Date;
  } = {}
): Promise<SyncResult<XeroItem[]>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);
    
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getItems(
        tenantId,
        options.modifiedAfter,
        undefined, // where
        undefined, // order
        undefined  // unitdp
      );
    });

    const items = (response.body.items || []) as XeroItem[];

    await logSyncSuccess(orgId, 'item', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
      recordsProcessed: items.length,
    });

    return {
      success: true,
      data: items,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'item', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
