/**
 * Xero OAuth2 Authorization Initiation
 * 
 * GET /api/xero/auth
 * 
 * Initiates the OAuth2 authorization flow by redirecting the user
 * to Xero's consent page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildConsentUrl, isXeroConfigured } from '@/lib/xero/client';
import { hasActiveConnection } from '@/lib/xero/token-manager';
import { handleApiError } from '@/lib/xero/errors';
import crypto from 'crypto';

/**
 * Generate a secure state parameter for CSRF protection
 */
function generateState(orgId: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = { orgId, nonce, timestamp: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export async function GET(request: NextRequest) {
  console.log('[Xero Auth] Starting OAuth initiation request');

  try {
    // Verify user is authenticated
    const { userId, orgId } = await auth();
    console.log('[Xero Auth] Authentication check:', { userId: !!userId, orgId: !!orgId });

    if (!userId) {
      console.log('[Xero Auth] No user ID - unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!orgId) {
      console.log('[Xero Auth] No org ID - no organization selected');
      return NextResponse.json(
        { error: 'No organization selected. Please select an organization.' },
        { status: 400 }
      );
    }

    console.log('[Xero Auth] User authenticated for org:', orgId);

    // Check if Xero is configured
    const configured = isXeroConfigured();
    console.log('[Xero Auth] Xero configured:', configured);

    if (!configured) {
      console.log('[Xero Auth] Xero not configured - environment variables missing');
      return NextResponse.json(
        { error: 'Xero integration is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Check if already connected
    const isConnected = await hasActiveConnection(orgId);
    const forceReconnect = request.nextUrl.searchParams.get('force') === 'true';
    console.log('[Xero Auth] Connection status:', { isConnected, forceReconnect });

    if (isConnected && !forceReconnect) {
      console.log('[Xero Auth] Already connected - rejecting request');
      return NextResponse.json(
        {
          error: 'Already connected to Xero',
          message: 'Use ?force=true to reconnect'
        },
        { status: 400 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = generateState(orgId);
    console.log('[Xero Auth] Generated state parameter');

    // Build consent URL with state
    console.log('[Xero Auth] Building consent URL');
    const consentUrl = await buildConsentUrl(state);
    console.log('[Xero Auth] Consent URL built successfully');

    // Return redirect URL (client will handle redirect)
    console.log('[Xero Auth] Returning consent URL to client');
    return NextResponse.json({
      success: true,
      redirectUrl: consentUrl,
      message: 'Redirect to Xero for authorization',
    });

  } catch (error) {
    console.error('[Xero Auth] Error in OAuth initiation:', error);
    return handleApiError(error, 'Xero Auth');
  }
}
