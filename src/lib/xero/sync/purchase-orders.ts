/**
 * Xero Purchase Orders Sync
 * 
 * Handles synchronization of Purchase Orders between NXT and Xero.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { mapPurchaseOrderToXero, generateSyncHash } from '../mappers';
import { parseXeroApiError } from '../errors';
import { 
  getXeroEntityId, 
  saveEntityMapping, 
  getAccountMappings 
} from './helpers';
import type { XeroPurchaseOrder, SyncResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface NxtPurchaseOrder {
  id: string;
  supplierId: string;
  poNumber: string;
  createdDate: Date | string;
  requestedDeliveryDate?: Date | string;
  deliveryAddress?: string;
  notes?: string;
  items: Array<{
    productCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// ============================================================================
// SYNC PURCHASE ORDER TO XERO
// ============================================================================

/**
 * Sync a purchase order to Xero
 */
export async function syncPurchaseOrderToXero(
  orgId: string,
  po: NxtPurchaseOrder
): Promise<SyncResult<XeroPurchaseOrder>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero contact ID for supplier
    const xeroContactId = await getXeroEntityId(orgId, 'contact', po.supplierId);
    if (!xeroContactId) {
      throw new Error('Supplier not synced to Xero. Sync supplier first.');
    }

    // Get account mappings
    const accountMappings = await getAccountMappings(orgId);

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'purchase_order', po.id);
    
    // Map to Xero format
    const xeroPO = mapPurchaseOrderToXero(po, xeroContactId, accountMappings);
    if (existingXeroId) {
      xeroPO.PurchaseOrderID = existingXeroId;
    }
    
    const syncHash = generateSyncHash(xeroPO);

    let result: XeroPurchaseOrder;
    let action: 'create' | 'update';

    if (existingXeroId) {
      action = 'update';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updatePurchaseOrder(tenantId, existingXeroId, { purchaseOrders: [xeroPO] });
      });
      result = response.body.purchaseOrders?.[0] as XeroPurchaseOrder;
    } else {
      action = 'create';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createPurchaseOrders(tenantId, { purchaseOrders: [xeroPO] });
      });
      result = response.body.purchaseOrders?.[0] as XeroPurchaseOrder;
    }

    if (!result?.PurchaseOrderID) {
      throw new Error('No PurchaseOrderID returned from Xero');
    }

    await saveEntityMapping(orgId, 'purchase_order', po.id, result.PurchaseOrderID, syncHash);

    await logSyncSuccess(orgId, 'purchase_order', action, 'to_xero', {
      nxtEntityId: po.id,
      xeroEntityId: result.PurchaseOrderID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.PurchaseOrderID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'purchase_order', 'create', 'to_xero', parsedError, {
      nxtEntityId: po.id,
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
// FETCH PURCHASE ORDERS FROM XERO
// ============================================================================

/**
 * Fetch purchase orders from Xero
 */
export async function fetchPurchaseOrdersFromXero(
  orgId: string,
  options: {
    status?: string;
    modifiedAfter?: Date;
    page?: number;
  } = {}
): Promise<SyncResult<XeroPurchaseOrder[]>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getPurchaseOrders(
        tenantId,
        options.modifiedAfter,
        options.status, // status filter
        undefined, // dateFrom
        undefined, // dateTo
        undefined, // order
        options.page
      );
    });

    const purchaseOrders = (response.body.purchaseOrders || []) as XeroPurchaseOrder[];

    await logSyncSuccess(orgId, 'purchase_order', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
      recordsProcessed: purchaseOrders.length,
    });

    return {
      success: true,
      data: purchaseOrders,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'purchase_order', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
