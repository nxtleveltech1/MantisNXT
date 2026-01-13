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
  try {
    // Verify user is authenticated
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected. Please select an organization.' },
        { status: 400 }
      );
    }

    // Check if Xero is configured
    if (!isXeroConfigured()) {
      return NextResponse.json(
        { error: 'Xero integration is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Check if already connected
    const isConnected = await hasActiveConnection(orgId);
    const forceReconnect = request.nextUrl.searchParams.get('force') === 'true';

    if (isConnected && !forceReconnect) {
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

    // Build consent URL with state
    const consentUrl = await buildConsentUrl(state);

    // Return redirect URL (client will handle redirect)
    return NextResponse.json({
      success: true,
      redirectUrl: consentUrl,
      message: 'Redirect to Xero for authorization',
    });

  } catch (error) {
    return handleApiError(error, 'Xero Auth');
  }
}
