/**
 * Xero OAuth2 Callback Handler
 * 
 * GET /api/xero/callback
 * 
 * Handles the OAuth2 callback from Xero after user authorization.
 * Exchanges the authorization code for tokens and stores them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getXeroClient, getAppUrl } from '@/lib/xero/client';
import { saveTokenSet } from '@/lib/xero/token-manager';
import type { XeroTenant } from '@/lib/xero/types';

/**
 * Parse and validate state parameter
 */
function parseState(state: string): { orgId: string; nonce: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const payload = JSON.parse(decoded);
    
    // Validate timestamp (state valid for 10 minutes)
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - payload.timestamp > tenMinutes) {
      console.warn('[Xero Callback] State expired');
      return null;
    }
    
    return payload;
  } catch {
    console.error('[Xero Callback] Failed to parse state');
    return null;
  }
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const searchParams = request.nextUrl.searchParams;
  
  // Get OAuth callback parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors from Xero
  if (error) {
    console.error('[Xero Callback] OAuth error:', error, errorDescription);
    const errorUrl = new URL('/settings/integrations', appUrl);
    errorUrl.searchParams.set('xero_error', error);
    errorUrl.searchParams.set('xero_error_description', errorDescription || 'Authorization failed');
    return NextResponse.redirect(errorUrl);
  }

  // Validate required parameters
  if (!code) {
    console.error('[Xero Callback] Missing authorization code');
    const errorUrl = new URL('/settings/integrations', appUrl);
    errorUrl.searchParams.set('xero_error', 'missing_code');
    return NextResponse.redirect(errorUrl);
  }

  if (!state) {
    console.error('[Xero Callback] Missing state parameter');
    const errorUrl = new URL('/settings/integrations', appUrl);
    errorUrl.searchParams.set('xero_error', 'missing_state');
    return NextResponse.redirect(errorUrl);
  }

  // Parse and validate state
  const statePayload = parseState(state);
  if (!statePayload) {
    const errorUrl = new URL('/settings/integrations', appUrl);
    errorUrl.searchParams.set('xero_error', 'invalid_state');
    return NextResponse.redirect(errorUrl);
  }

  // Verify user is authenticated and matches state org
  const { userId, orgId } = await auth();
  
  if (!userId) {
    const errorUrl = new URL('/sign-in', appUrl);
    errorUrl.searchParams.set('redirect_url', '/settings/integrations');
    return NextResponse.redirect(errorUrl);
  }

  if (!orgId || orgId !== statePayload.orgId) {
    console.error('[Xero Callback] Organization mismatch');
    const errorUrl = new URL('/settings/integrations', appUrl);
    errorUrl.searchParams.set('xero_error', 'org_mismatch');
    return NextResponse.redirect(errorUrl);
  }

  try {
    const xero = getXeroClient();
    
    // Exchange authorization code for tokens
    const fullCallbackUrl = request.url;
    const tokenSet = await xero.apiCallback(fullCallbackUrl);

    // Get connected tenants
    await xero.updateTenants();
    const tenants = xero.tenants;

    if (!tenants || tenants.length === 0) {
      console.error('[Xero Callback] No tenants available');
      const errorUrl = new URL('/settings/integrations', appUrl);
      errorUrl.searchParams.set('xero_error', 'no_tenants');
      return NextResponse.redirect(errorUrl);
    }

    // Use the first tenant (most common case)
    // For multi-org support, you could present a tenant selection UI
    const tenant = tenants[0] as XeroTenant;

    // Save the tokens
    await saveTokenSet(orgId, tokenSet, tenant);

    console.log('[Xero Callback] Successfully connected to Xero tenant:', tenant.tenantName);

    // Redirect to success page
    const successUrl = new URL('/settings/integrations', appUrl);
    successUrl.searchParams.set('xero_connected', 'true');
    successUrl.searchParams.set('xero_tenant', tenant.tenantName || '');
    return NextResponse.redirect(successUrl);

  } catch (err) {
    console.error('[Xero Callback] Error exchanging code for tokens:', err);
    
    const errorUrl = new URL('/settings/integrations', appUrl);
    errorUrl.searchParams.set('xero_error', 'token_exchange_failed');
    errorUrl.searchParams.set(
      'xero_error_description', 
      err instanceof Error ? err.message : 'Failed to connect to Xero'
    );
    return NextResponse.redirect(errorUrl);
  }
}
