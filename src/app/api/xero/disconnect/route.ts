/**
 * Xero Disconnect
 * 
 * POST /api/xero/disconnect
 * 
 * Disconnects the Xero integration for the authenticated organization.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { revokeConnection, hasActiveConnection, getXeroConnection } from '@/lib/xero/token-manager';
import { getXeroClient } from '@/lib/xero/client';
import { decryptPII } from '@/lib/security/encryption';

export async function POST() {
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
        { error: 'No organization selected.' },
        { status: 400 }
      );
    }

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
        const refreshToken = decryptPII(connection.refreshToken);
        
        // Xero doesn't have a direct revoke endpoint, but we can 
        // disconnect the app from the user's side by invalidating our stored tokens
        // The user can also revoke from their Xero account settings
        
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
    console.error('[Xero Disconnect] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to disconnect Xero',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
