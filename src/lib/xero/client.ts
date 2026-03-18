/**
 * Xero Client Singleton
 *
 * Provides configured XeroClient instances for OAuth2 authentication
 * and API access to Xero accounting services.
 */

import { XeroClient, type IXeroClientConfig } from 'xero-node';

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const XERO_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'accounting.transactions',
  'accounting.transactions.read',
  'accounting.contacts',
  'accounting.contacts.read',
  'accounting.settings',
  'accounting.settings.read',
  'accounting.reports.read',
  'accounting.attachments',
  'accounting.attachments.read',
].join(' ');

let xeroClientInstance: XeroClient | null = null;

function assertXeroConfigured(): void {
  if (!XERO_CLIENT_ID) {
    throw new Error('XERO_CLIENT_ID environment variable is not configured');
  }
  if (!XERO_CLIENT_SECRET) {
    throw new Error('XERO_CLIENT_SECRET environment variable is not configured');
  }
}

function buildXeroClientConfig(overrides: Partial<IXeroClientConfig> = {}): IXeroClientConfig {
  assertXeroConfigured();

  return {
    clientId: XERO_CLIENT_ID!,
    clientSecret: XERO_CLIENT_SECRET!,
    redirectUris: [`${APP_URL}/api/xero/callback`],
    scopes: XERO_SCOPES.split(' '),
    httpTimeout: 30000,
    clockTolerance: 10,
    ...overrides,
  };
}

export function createXeroClient(overrides: Partial<IXeroClientConfig> = {}): XeroClient {
  return new XeroClient(buildXeroClientConfig(overrides));
}

export function getXeroClient(): XeroClient {
  if (!xeroClientInstance) {
    xeroClientInstance = createXeroClient();
  }

  return xeroClientInstance;
}

export async function buildConsentUrl(state?: string): Promise<string> {
  const client = createXeroClient(state ? { state } : {});
  return client.buildConsentUrl();
}

export async function getOAuthCallbackClient(state: string): Promise<XeroClient> {
  return createXeroClient({ state });
}

export function isXeroConfigured(): boolean {
  return Boolean(XERO_CLIENT_ID && XERO_CLIENT_SECRET);
}

export function getCallbackUrl(): string {
  return `${APP_URL}/api/xero/callback`;
}

export function getAppUrl(): string {
  return APP_URL;
}

export { XeroClient };
