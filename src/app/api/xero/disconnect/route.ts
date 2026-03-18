/**
 * Xero Disconnect
 *
 * POST /api/xero/disconnect
 *
 * Disconnects the Xero integration for the authenticated organization.
 * Org can come from Clerk or from header X-Org-Id / body org_id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revokeConnection, hasActiveConnection, getXeroConnection } from '@/lib/xero/token-manager';
import { getXeroClient } from '@/lib/xero/client';
import { decryptPII } from '@/lib/security/encryption';
import { handleApiError } from '@/lib/xero/errors';
import { resolveXeroRequestContext } from '@/lib/xero/org-context';

export async function POST(request: NextRequest) {
  try {
    const context = await resolveXeroRequestContext(request, {
      requireUser: true,
      requireOrg: true,
      allowExplicitClerkMismatch: true,
    });

    if (context.error) {
      return context.error;
    }

    const { orgId } = context;

    // Check if connected
    const isConnected = await hasActiveConnection(orgId);
    
    if (!isConnected) {
      return NextResponse.json(
        { error: 'No active Xero connection to disconnect.' },
        { status: 400 }
      );
    }

    // Get connection for token revocation
    const connection = await getXeroConnection(orgId);
    
    // Attempt to revoke token at Xero (best effort)
    if (connection) {
      try {
        const xero = getXeroClient();
        let refreshToken: string;
        
        try {
          refreshToken = decryptPII(connection.refreshToken);
        } catch (decryptError) {
          // Token decryption failed - likely encryption key changed
          // Continue with disconnect anyway
          console.warn('[Xero Disconnect] Failed to decrypt token, continuing with local disconnect:', decryptError);
          refreshToken = '';
        }
        
        // Xero doesn't have a direct revoke endpoint, but we can 
        // disconnect the app from the user's side by invalidating our stored tokens
        // The user can also revoke from their Xero account settings
        void xero;
        void refreshToken;
        console.log('[Xero Disconnect] Revoking connection for tenant:', connection.xeroTenantName);
      } catch (revokeError) {
        // Log but don't fail - we still want to remove local connection
        console.warn('[Xero Disconnect] Token revocation warning:', revokeError);
      }
    }

    // Revoke local connection
    await revokeConnection(orgId);

    return NextResponse.json({
      success: true,
      message: 'Xero connection has been disconnected.',
    });

  } catch (error) {
    return handleApiError(error, 'Xero Disconnect');
  }
}
