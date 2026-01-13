/**
 * Xero Client Singleton
 * 
 * Provides a configured XeroClient instance for OAuth2 authentication
 * and API access to Xero accounting services.
 */

import { XeroClient } from 'xero-node';

// ============================================================================
// CONFIGURATION
// ============================================================================

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// OAuth2 scopes for Xero API access
// See: https://developer.xero.com/documentation/guides/oauth2/scopes
export const XERO_SCOPES = [
  // OpenID Connect
  'openid',
  'profile',
  'email',
  'offline_access', // Required for refresh tokens
  
  // Accounting API
  'accounting.transactions',      // Invoices, Bills, Payments, Credit Notes
  'accounting.transactions.read',
  'accounting.contacts',          // Contacts (Customers, Suppliers)
  'accounting.contacts.read',
  'accounting.settings',          // Chart of Accounts, Tax Rates, Currencies
  'accounting.settings.read',
  'accounting.reports.read',      // Financial Reports
  'accounting.attachments',       // File attachments
  'accounting.attachments.read',
].join(' ');

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let xeroClientInstance: XeroClient | null = null;

/**
 * Get or create the XeroClient singleton instance
 * 
 * @throws Error if XERO_CLIENT_ID or XERO_CLIENT_SECRET are not configured
 */
export function getXeroClient(): XeroClient {
  if (!xeroClientInstance) {
    if (!XERO_CLIENT_ID) {
      throw new Error('XERO_CLIENT_ID environment variable is not configured');
    }
    if (!XERO_CLIENT_SECRET) {
      throw new Error('XERO_CLIENT_SECRET environment variable is not configured');
    }

    xeroClientInstance = new XeroClient({
      clientId: XERO_CLIENT_ID,
      clientSecret: XERO_CLIENT_SECRET,
      redirectUris: [`${APP_URL}/api/xero/callback`],
      scopes: XERO_SCOPES.split(' '),
      httpTimeout: 30000, // 30 second timeout
      clockTolerance: 10, // 10 second clock skew tolerance
    });
  }

  return xeroClientInstance;
}

/**
 * Build the OAuth2 consent URL for user authorization
 * 
 * @param state Optional state parameter for CSRF protection
 * @returns The URL to redirect users to for Xero authorization
 */
export async function buildConsentUrl(state?: string): Promise<string> {
  const client = getXeroClient();
  const consentUrl = await client.buildConsentUrl();
  
  if (state) {
    // Append state parameter for CSRF protection
    const url = new URL(consentUrl);
    url.searchParams.set('state', state);
    return url.toString();
  }
  
  return consentUrl;
}

/**
 * Check if Xero integration is configured
 * 
 * @returns true if both client ID and secret are set
 */
export function isXeroConfigured(): boolean {
  return Boolean(XERO_CLIENT_ID && XERO_CLIENT_SECRET);
}

/**
 * Get Xero OAuth2 callback URL
 */
export function getCallbackUrl(): string {
  return `${APP_URL}/api/xero/callback`;
}

/**
 * Get the app URL for OAuth redirects
 */
export function getAppUrl(): string {
  return APP_URL;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { XeroClient };
