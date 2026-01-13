/**
 * Xero Tracking Categories Sync
 *
 * Handles synchronization of Tracking Categories for departmental/project allocation.
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

export interface XeroTrackingCategory {
  TrackingCategoryID?: string;
  Name: string;
  Status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  Options?: Array<{
    TrackingOptionID?: string;
    Name: string;
    Status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  }>;
}

// ============================================================================
// SYNC TRACKING CATEGORY TO XERO
// ============================================================================

/**
 * Sync a tracking category to Xero
 */
export async function syncTrackingCategoryToXero(
  orgId: string,
  category: { name: string; options?: string[] }
): Promise<SyncResult<XeroTrackingCategory>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const xeroCategory: XeroTrackingCategory = {
      Name: category.name,
      Status: 'ACTIVE',
      Options: category.options?.map(opt => ({
        Name: opt,
        Status: 'ACTIVE',
      })),
    };

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.createTrackingCategory(tenantId, {
        trackingCategories: [xeroCategory],
      });
    });

    const result = response.body.trackingCategories?.[0] as XeroTrackingCategory;

    if (!result?.TrackingCategoryID) {
      throw new XeroSyncError(
        'No TrackingCategoryID returned from Xero',
        'tracking_category',
        category.name,
        'NO_TRACKING_CATEGORY_ID'
      );
    }

    await logSyncSuccess(orgId, 'tracking_category', 'create', 'to_xero', {
      xeroEntityId: result.TrackingCategoryID,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: result,
      xeroEntityId: result.TrackingCategoryID,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'tracking_category', 'create', 'to_xero', parsedError, {
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
 * Fetch tracking categories from Xero
 */
export async function fetchTrackingCategoriesFromXero(
  orgId: string
): Promise<SyncResult<XeroTrackingCategory[]>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getTrackingCategories(tenantId);
    });

    const categories = (response.body.trackingCategories || []) as XeroTrackingCategory[];

    await logSyncSuccess(orgId, 'tracking_category', 'fetch', 'from_xero', {
      recordsProcessed: categories.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: categories,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'tracking_category', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
