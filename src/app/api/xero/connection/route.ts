/**
 * Xero Connection Status
 *
 * GET /api/xero/connection
 *
 * Returns the current Xero connection status for the authenticated organization.
 * Org can come from Clerk (session) or from query param org_id / header X-Org-Id (fallback when Clerk has no org).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getXeroConnection, hasActiveConnection } from '@/lib/xero/token-manager';
import { isXeroConfigured } from '@/lib/xero/client';
import { handleApiError } from '@/lib/xero/errors';
import { resolveXeroRequestContext } from '@/lib/xero/org-context';

export async function GET(request: NextRequest) {
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

    // Check if Xero is configured at application level
    const isConfigured = isXeroConfigured();
    
    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        isConfigured: false,
        connected: false,
        isConnected: false,
        message: 'Xero integration is not configured for this application.',
      });
    }

    // Check connection status
    const isConnected = await hasActiveConnection(orgId);

    if (!isConnected) {
      return NextResponse.json({
        configured: true,
        isConfigured: true,
        connected: false,
        isConnected: false,
        message: 'Not connected to Xero. Click Connect to authorize.',
      });
    }

    // Get connection details
    const connection = await getXeroConnection(orgId);

    if (!connection) {
      return NextResponse.json({
        configured: true,
        isConfigured: true,
        connected: false,
        isConnected: false,
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

    const connectionData = {
      tenantId: connection.xeroTenantId,
      tenantName: connection.xeroTenantName,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      scopes: connection.scopes ?? [],
      tokenStatus: {
        isExpired: isTokenExpired,
        expiresInMinutes: tokenExpiresInMinutes,
        expiresAt: tokenExpiresAt,
      },
    };

    return NextResponse.json({
      configured: true,
      isConfigured: true,
      connected: true,
      isConnected: true,
      message: 'Connected to Xero.',
      connection: connectionData,
      // Normalized flat shape for settings and integrations pages
      tenantId: connection.xeroTenantId,
      tenantName: connection.xeroTenantName ?? null,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt ?? null,
      tokenExpiresAt: tokenExpiresAt.toISOString(),
      scopes: connection.scopes ?? [],
    });

  } catch (error) {
    return handleApiError(error, 'Xero Connection');
  }
}
