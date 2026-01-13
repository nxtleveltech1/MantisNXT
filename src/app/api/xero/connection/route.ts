/**
 * Xero Connection Status
 * 
 * GET /api/xero/connection
 * 
 * Returns the current Xero connection status for the authenticated organization.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getXeroConnection, hasActiveConnection } from '@/lib/xero/token-manager';
import { isXeroConfigured } from '@/lib/xero/client';

export async function GET() {
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

    // Check if Xero is configured at application level
    const isConfigured = isXeroConfigured();
    
    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: 'Xero integration is not configured for this application.',
      });
    }

    // Check connection status
    const isConnected = await hasActiveConnection(orgId);
    
    if (!isConnected) {
      return NextResponse.json({
        configured: true,
        connected: false,
        message: 'Not connected to Xero. Click Connect to authorize.',
      });
    }

    // Get connection details
    const connection = await getXeroConnection(orgId);
    
    if (!connection) {
      return NextResponse.json({
        configured: true,
        connected: false,
        message: 'Connection record not found.',
      });
    }

    // Calculate token expiry status
    const now = new Date();
    const tokenExpiresAt = new Date(connection.tokenExpiresAt);
    const isTokenExpired = tokenExpiresAt <= now;
    const tokenExpiresInMinutes = Math.max(
      0,
      Math.floor((tokenExpiresAt.getTime() - now.getTime()) / 60000)
    );

    return NextResponse.json({
      configured: true,
      connected: true,
      connection: {
        tenantId: connection.xeroTenantId,
        tenantName: connection.xeroTenantName,
        connectedAt: connection.connectedAt,
        lastSyncAt: connection.lastSyncAt,
        scopes: connection.scopes,
        tokenStatus: {
          isExpired: isTokenExpired,
          expiresInMinutes: tokenExpiresInMinutes,
          expiresAt: tokenExpiresAt,
        },
      },
    });

  } catch (error) {
    console.error('[Xero Connection] Error checking status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check Xero connection status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
