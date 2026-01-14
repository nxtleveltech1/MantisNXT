/**
 * Xero Contacts Sync
 * 
 * Handles synchronization of Suppliers and Customers between NXT and Xero.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError, logBatchSync } from '../sync-logger';
import { mapSupplierToXeroContact, mapCustomerToXeroContact, generateSyncHash } from '../mappers';
import { parseXeroApiError, XeroSyncError } from '../errors';
import { 
  getXeroEntityId, 
  saveEntityMapping, 
  markMappingError 
} from './helpers';
import type { Supplier } from '@/types/supplier';
import type { XeroContact, SyncResult, BatchSyncResult } from '../types';

// ============================================================================
// SYNC SUPPLIER TO XERO
// ============================================================================

/**
 * Sync a single supplier to Xero
 */
export async function syncSupplierToXero(
  orgId: string,
  supplier: Supplier
): Promise<SyncResult<XeroContact>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'contact', supplier.id);
    
    // Map to Xero format
    const xeroContact = mapSupplierToXeroContact(supplier, existingXeroId || undefined);
    const syncHash = generateSyncHash(xeroContact);

    let result: XeroContact;
    let action: 'create' | 'update';

    if (existingXeroId) {
      // Update existing contact
      action = 'update';
      console.log(`[Xero Sync] Updating contact ${existingXeroId} for org ${orgId}`);
      console.log(`[Xero Sync] Update payload:`, JSON.stringify(xeroContact, null, 2));
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updateContact(tenantId, existingXeroId, { contacts: [xeroContact] });
      });
      console.log(`[Xero Sync] Update response:`, JSON.stringify(response.body, null, 2));
      const contacts = response.body?.contacts;
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        throw new XeroSyncError(
          'No contacts returned from Xero API',
          'contact',
          supplier.id,
          'NO_CONTACTS_RETURNED'
        );
      }
      result = contacts[0] as XeroContact;
    } else {
      // Create new contact
      action = 'create';
      console.log(`[Xero Sync] Creating new contact for org ${orgId}`);
      console.log(`[Xero Sync] Create payload:`, JSON.stringify(xeroContact, null, 2));
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createContacts(tenantId, { contacts: [xeroContact] });
      });
      console.log(`[Xero Sync] Create response:`, JSON.stringify(response.body, null, 2));
      const contacts = response.body?.contacts;
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        throw new XeroSyncError(
          'No contacts returned from Xero API',
          'contact',
          supplier.id,
          'NO_CONTACTS_RETURNED'
        );
      }
      result = contacts[0] as XeroContact;
    }

    if (!result?.ContactID) {
      throw new XeroSyncError(
        'No ContactID returned from Xero',
        'contact',
        supplier.id,
        'NO_CONTACT_ID'
      );
    }

    // Save mapping
    await saveEntityMapping(orgId, 'contact', supplier.id, result.ContactID, syncHash);

    // Log success
    await logSyncSuccess(orgId, 'contact', action, 'to_xero', {
      nxtEntityId: supplier.id,
      xeroEntityId: result.ContactID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.ContactID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'contact', 'create', 'to_xero', parsedError, {
      nxtEntityId: supplier.id,
      durationMs: Date.now() - startTime,
    });

    await markMappingError(orgId, 'contact', supplier.id, parsedError.message);

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}

/**
 * Batch sync multiple suppliers to Xero
 */
export async function syncSuppliersToXero(
  orgId: string,
  suppliers: Supplier[]
): Promise<BatchSyncResult> {
  const startTime = Date.now();
  const results: BatchSyncResult = {
    total: suppliers.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const supplier of suppliers) {
    const result = await syncSupplierToXero(orgId, supplier);
    
    if (result.success) {
      results.succeeded++;
    } else {
      results.failed++;
      results.errors.push({
        nxtEntityId: supplier.id,
        error: result.error || 'Unknown error',
      });
    }
  }

  // Log batch result
  await logBatchSync(orgId, 'contact', 'to_xero', {
    total: results.total,
    succeeded: results.succeeded,
    failed: results.failed,
    durationMs: Date.now() - startTime,
    errors: results.errors,
  });

  return results;
}

// ============================================================================
// SYNC CUSTOMER TO XERO
// ============================================================================

/**
 * Sync a single customer to Xero
 */
export async function syncCustomerToXero(
  orgId: string,
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    taxNumber?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  }
): Promise<SyncResult<XeroContact>> {
  const startTime = Date.now();
  
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Check if already synced
    const existingXeroId = await getXeroEntityId(orgId, 'contact', customer.id);
    
    // Map to Xero format
    const xeroContact = mapCustomerToXeroContact(customer, existingXeroId || undefined);
    const syncHash = generateSyncHash(xeroContact);

    let result: XeroContact;
    let action: 'create' | 'update';

    if (existingXeroId) {
      action = 'update';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.updateContact(tenantId, existingXeroId, { contacts: [xeroContact] });
      });
      const contacts = response.body?.contacts;
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        throw new XeroSyncError(
          'No contacts returned from Xero API',
          'contact',
          supplier.id,
          'NO_CONTACTS_RETURNED'
        );
      }
      result = contacts[0] as XeroContact;
    } else {
      action = 'create';
      const response = await callXeroApi(tenantId, async () => {
        return xero.accountingApi.createContacts(tenantId, { contacts: [xeroContact] });
      });
      const contacts = response.body?.contacts;
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        throw new XeroSyncError(
          'No contacts returned from Xero API',
          'contact',
          supplier.id,
          'NO_CONTACTS_RETURNED'
        );
      }
      result = contacts[0] as XeroContact;
    }

    if (!result?.ContactID) {
      throw new XeroSyncError(
        'No ContactID returned from Xero',
        'contact',
        customer.id,
        'NO_CONTACT_ID'
      );
    }

    await saveEntityMapping(orgId, 'contact', customer.id, result.ContactID, syncHash);

    await logSyncSuccess(orgId, 'contact', action, 'to_xero', {
      nxtEntityId: customer.id,
      xeroEntityId: result.ContactID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.ContactID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'contact', 'create', 'to_xero', parsedError, {
      nxtEntityId: customer.id,
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
// FETCH CONTACTS FROM XERO
// ============================================================================

/**
 * Fetch all contacts from Xero
 */
export async function fetchContactsFromXero(
  orgId: string,
  options: {
    isSupplier?: boolean;
    isCustomer?: boolean;
    modifiedAfter?: Date;
    page?: number;
  } = {}
): Promise<SyncResult<XeroContact[]>> {
  const startTime = Date.now();
  
  try {
    console.log(`[Xero Sync] Starting fetch contacts for org ${orgId}`, options);
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Build where clause
    const whereClauses: string[] = [];
    if (options.isSupplier) whereClauses.push('IsSupplier==true');
    if (options.isCustomer) whereClauses.push('IsCustomer==true');

    const where = whereClauses.length > 0 ? whereClauses.join(' AND ') : undefined;
    console.log(`[Xero Sync] Fetching contacts with where clause: ${where}`);

    const response = await callXeroApi(tenantId, async () => {
      console.log(`[Xero Sync] Calling getContacts API for tenant ${tenantId}`);
      return xero.accountingApi.getContacts(
        tenantId,
        options.modifiedAfter,
        where,
        undefined, // order
        undefined, // IDs
        options.page,
        false, // includeArchived
        false, // summaryOnly
        undefined // searchTerm
      );
    });

    console.log(`[Xero Sync] API response received:`, {
      hasContacts: !!response.body.contacts,
      contactCount: response.body.contacts?.length || 0,
      responseKeys: Object.keys(response.body)
    });

    const contacts = (response.body?.contacts || []) as XeroContact[];

    await logSyncSuccess(orgId, 'contact', 'fetch', 'from_xero', {
      durationMs: Date.now() - startTime,
      recordsProcessed: contacts.length,
    });

    return {
      success: true,
      data: contacts,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    
    await logSyncError(orgId, 'contact', 'fetch', 'from_xero', parsedError, {
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
 * Get a single contact from Xero by ID
 */
export async function getContactFromXero(
  orgId: string,
  xeroContactId: string
): Promise<SyncResult<XeroContact>> {
  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getContact(tenantId, xeroContactId);
    });

    const contact = response.body.contacts?.[0] as XeroContact;

    if (!contact) {
      return {
        success: false,
        error: 'Contact not found',
        errorCode: 'NOT_FOUND',
      };
    }

    return {
      success: true,
      data: contact,
      xeroEntityId: contact.ContactID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);
    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
