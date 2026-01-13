/**
 * Xero Branding Themes Sync
 *
 * Fetch Branding Themes and Payment Services for invoice customization.
 */

import { getXeroClient } from '../client';
import { getValidTokenSet } from '../token-manager';
import { callXeroApi } from '../rate-limiter';
import { logSyncSuccess, logSyncError } from '../sync-logger';
import { parseXeroApiError } from '../errors';
import type { SyncResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface XeroBrandingTheme {
  BrandingThemeID?: string;
  Name?: string;
  LogoUrl?: string;
  Type?: string;
  CreatedDateUTC?: string;
  UpdatedDateUTC?: string;
}

export interface XeroPaymentService {
  PaymentServiceID?: string;
  PaymentServiceName?: string;
  PaymentServiceUrl?: string;
  PayNowText?: string;
  PaymentServiceType?: string;
}

// ============================================================================
// FETCH BRANDING THEMES FROM XERO
// ============================================================================

/**
 * Fetch branding themes from Xero
 */
export async function fetchBrandingThemesFromXero(
  orgId: string
): Promise<SyncResult<XeroBrandingTheme[]>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getBrandingThemes(tenantId);
    });

    const themes = (response.body.brandingThemes || []) as XeroBrandingTheme[];

    await logSyncSuccess(orgId, 'branding_theme', 'fetch', 'from_xero', {
      recordsProcessed: themes.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: themes,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'branding_theme', 'fetch', 'from_xero', parsedError, {
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
 * Fetch payment services for a branding theme
 */
export async function fetchPaymentServicesFromXero(
  orgId: string,
  brandingThemeId: string
): Promise<SyncResult<XeroPaymentService[]>> {
  const startTime = Date.now();

  try {
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getPaymentServices(tenantId, brandingThemeId);
    });

    const services = (response.body.paymentServices || []) as XeroPaymentService[];

    await logSyncSuccess(orgId, 'payment_service', 'fetch', 'from_xero', {
      recordsProcessed: services.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: services,
    };

  } catch (error) {
    const parsedError = parseXeroApiError(error);

    await logSyncError(orgId, 'payment_service', 'fetch', 'from_xero', parsedError, {
      durationMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: parsedError.message,
      errorCode: parsedError.code,
    };
  }
}
