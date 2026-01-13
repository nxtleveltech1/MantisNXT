/**
 * Xero Contact Groups Sync
 *
 * Handles synchronization of Contact Groups for customer/supplier segmentation.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { parseXeroApiError, XeroSyncError } from '../errors';
import type { SyncResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface XeroContactGroup {
  ContactGroupID?: string;
  Name: string;
  Status: 'ACTIVE' | 'DELETED';
  Contacts?: Array<{
    ContactID: string;
  }>;
}

// ============================================================================
// SYNC CONTACT GROUP TO XERO
// ============================================================================

/**
 * Sync a contact group to Xero
 */
export async function syncContactGroupToXero(
  orgId: string,
  group: { name: string; contactIds?: string[] }
): Promise<SyncResult<XeroContactGroup>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero contact IDs
    const { getXeroEntityId } = await import('./helpers');
    const xeroContactIds: string[] = [];

    if (group.contactIds) {
      for (const contactId of group.contactIds) {
        const xeroId = await getXeroEntityId(orgId, 'contact', contactId);
        if (xeroId) {
          xeroContactIds.push(xeroId);
        }
      }
    }

    const xeroGroup: XeroContactGroup = {
      Name: group.name,
      Status: 'ACTIVE',
      Contacts: xeroContactIds.map(id => ({ ContactID: id })),
    };

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.createContactGroup(tenantId, {
        contactGroups: [xeroGroup],
      });
    });

    const result = response.body.contactGroups?.[0] as XeroContactGroup;

    if (!result?.ContactGroupID) {
      throw new XeroSyncError(
        'No ContactGroupID returned from Xero',
        'contact_group',
        group.name,
        'NO_CONTACT_GROUP_ID'
      );
    }

    await logSyncSuccess(orgId, 'contact_group', 'create', 'to_xero', {
      xeroEntityId: result.ContactGroupID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.ContactGroupID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'contact_group', 'create', 'to_xero', parsedError, {
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
 * Fetch contact groups from Xero
 */
export async function fetchContactGroupsFromXero(
  orgId: string
): Promise<SyncResult<XeroContactGroup[]>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getContactGroups(tenantId);
    });

    const groups = (response.body.contactGroups || []) as XeroContactGroup[];

    await logSyncSuccess(orgId, 'contact_group', 'fetch', 'from_xero', {
      recordsProcessed: groups.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: groups,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'contact_group', 'fetch', 'from_xero', parsedError, {
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
 * Add contacts to a contact group
 */
export async function addContactsToGroup(
  orgId: string,
  groupId: string,
  contactIds: string[]
): Promise<SyncResult<XeroContactGroup>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Get Xero contact IDs
    const { getXeroEntityId } = await import('./helpers');
    const xeroContactIds: string[] = [];

    for (const contactId of contactIds) {
      const xeroId = await getXeroEntityId(orgId, 'contact', contactId);
      if (xeroId) {
        xeroContactIds.push(xeroId);
      }
    }

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.updateContactGroup(tenantId, groupId, {
        contactGroups: [{
          Contacts: xeroContactIds.map(id => ({ ContactID: id })),
        }],
      });
    });

    const result = response.body.contactGroups?.[0] as XeroContactGroup;

    await logSyncSuccess(orgId, 'contact_group', 'update', 'to_xero', {
      xeroEntityId: groupId,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'contact_group', 'update', 'to_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
