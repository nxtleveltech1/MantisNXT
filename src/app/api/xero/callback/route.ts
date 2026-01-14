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

    // Validate payload structure
    if (!payload || typeof payload !== 'object') {
      console.error('[Xero Callback] Invalid state payload structure');
      return null;
    }

    // Validate required fields
    if (!payload.orgId || typeof payload.orgId !== 'string') {
      console.error('[Xero Callback] Missing or invalid orgId in state');
      return null;
    }

    if (!payload.nonce || typeof payload.nonce !== 'string' || payload.nonce.length < 16) {
      console.error('[Xero Callback] Missing or invalid nonce in state');
      return null;
    }

    if (!payload.timestamp || typeof payload.timestamp !== 'number') {
      console.error('[Xero Callback] Missing or invalid timestamp in state');
      return null;
    }

    // Validate timestamp (state valid for 10 minutes)
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - payload.timestamp > tenMinutes) {
      console.warn('[Xero Callback] State expired');
      return null;
    }

    // Validate timestamp is not in the future (with 5 second tolerance)
    if (payload.timestamp > Date.now() + 5000) {
      console.warn('[Xero Callback] State timestamp is in the future');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('[Xero Callback] Failed to parse state:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const searchParams = request.nextUrl.searchParams;

  console.log('[Xero Callback] Starting OAuth callback processing');

  // Get OAuth callback parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  console.log('[Xero Callback] Callback parameters:', {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
    errorDescription
  });

  // Handle OAuth errors from Xero
  if (error) {
    console.error('[Xero Callback] OAuth error from Xero:', { error, errorDescription });
    const errorUrl = new URL('/integrations/xero', appUrl);
    errorUrl.searchParams.set('xero_error', error);
    errorUrl.searchParams.set('xero_error_description', errorDescription || 'Authorization failed');
    return NextResponse.redirect(errorUrl);
  }

  // Validate required parameters
  if (!code) {
    console.error('[Xero Callback] Missing authorization code');
    const errorUrl = new URL('/integrations/xero', appUrl);
    errorUrl.searchParams.set('xero_error', 'missing_code');
    return NextResponse.redirect(errorUrl);
  }

  if (!state) {
    console.error('[Xero Callback] Missing state parameter');
    const errorUrl = new URL('/integrations/xero', appUrl);
    errorUrl.searchParams.set('xero_error', 'missing_state');
    return NextResponse.redirect(errorUrl);
  }

  // Parse and validate state
  console.log('[Xero Callback] Parsing state parameter');
  const statePayload = parseState(state);
  if (!statePayload) {
    console.error('[Xero Callback] Invalid state parameter');
    const errorUrl = new URL('/integrations/xero', appUrl);
    errorUrl.searchParams.set('xero_error', 'invalid_state');
    return NextResponse.redirect(errorUrl);
  }

  console.log('[Xero Callback] State validated for org:', statePayload.orgId);

  // Verify user is authenticated and matches state org
  console.log('[Xero Callback] Verifying user authentication');
  const { userId, orgId } = await auth();

  if (!userId) {
    console.log('[Xero Callback] User not authenticated - redirecting to sign-in');
    const errorUrl = new URL('/sign-in', appUrl);
    errorUrl.searchParams.set('redirect_url', '/integrations/xero');
    return NextResponse.redirect(errorUrl);
  }

  if (!orgId || orgId !== statePayload.orgId) {
    console.error('[Xero Callback] Organization mismatch:', { authOrgId: orgId, stateOrgId: statePayload.orgId });
    const errorUrl = new URL('/integrations/xero', appUrl);
    errorUrl.searchParams.set('xero_error', 'org_mismatch');
    return NextResponse.redirect(errorUrl);
  }

  console.log('[Xero Callback] User authenticated for org:', orgId);

  try {
    console.log('[Xero Callback] Initializing Xero client');
    const xero = getXeroClient();

    console.log('[Xero Callback] Exchanging authorization code for tokens');
    const fullCallbackUrl = request.url;
    const tokenSet = await xero.apiCallback(fullCallbackUrl);

    console.log('[Xero Callback] Token exchange successful');
    console.log('[Xero Callback] Updating tenants');
    await xero.updateTenants();
    const tenants = xero.tenants;

    console.log('[Xero Callback] Tenants retrieved:', tenants?.length || 0);

    if (!tenants || tenants.length === 0) {
      console.error('[Xero Callback] No tenants available');
      const errorUrl = new URL('/integrations/xero', appUrl);
      errorUrl.searchParams.set('xero_error', 'no_tenants');
      return NextResponse.redirect(errorUrl);
    }

    // Use the first tenant (most common case)
    // For multi-org support, you could present a tenant selection UI
    const tenant = tenants[0] as XeroTenant;
    console.log('[Xero Callback] Selected tenant:', tenant.tenantName, tenant.tenantId);

    console.log('[Xero Callback] Saving token set to database');
    await saveTokenSet(orgId, tokenSet, tenant);

    console.log('[Xero Callback] Successfully connected to Xero tenant:', tenant.tenantName);

    // Redirect to success page
    const successUrl = new URL('/integrations/xero', appUrl);
    successUrl.searchParams.set('xero_connected', 'true');
    successUrl.searchParams.set('xero_tenant', tenant.tenantName || '');
    return NextResponse.redirect(successUrl);

  } catch (err) {
    console.error('[Xero Callback] Error exchanging code for tokens:', err);

    const errorUrl = new URL('/integrations/xero', appUrl);
    errorUrl.searchParams.set('xero_error', 'token_exchange_failed');
    errorUrl.searchParams.set(
      'xero_error_description',
      err instanceof Error ? err.message : 'Failed to connect to Xero'
    );
    return NextResponse.redirect(errorUrl);
  }
}
