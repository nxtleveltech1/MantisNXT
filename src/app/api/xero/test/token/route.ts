/**
 * Token Validation Test Endpoint
 *
 * GET /api/xero/test/token?orgId=org_123
 *
 * Tests token retrieval, validation, and TokenSet structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getValidTokenSet, getXeroConnection } from '@/lib/xero/token-manager';
import { getXeroClient } from '@/lib/xero/client';

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, any>,
  };

  try {
    // Verify user authentication
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

    results.checks.auth = { userId: !!userId, orgId };

    // Check database connection
    const connection = await getXeroConnection(orgId);
    results.checks.database = {
      hasConnection: !!connection,
      tenantId: connection?.xeroTenantId,
      tenantName: connection?.xeroTenantName,
      isActive: connection?.isActive,
      connectedAt: connection?.connectedAt,
      lastSyncAt: connection?.lastSyncAt,
      tokenExpiresAt: connection?.tokenExpiresAt,
      hasAccessToken: !!connection?.accessToken,
      hasRefreshToken: !!connection?.refreshToken,
    };

    if (!connection) {
      return NextResponse.json({
        ...results,
        status: 'NO_CONNECTION',
        message: 'No Xero connection found in database',
      });
    }

    // Test token retrieval
    try {
      console.log('[Token Test] Getting valid token set');
      const { tokenSet, tenantId } = await getValidTokenSet(orgId);

      results.checks.tokenRetrieval = {
        success: true,
        tenantId,
        tokenSet: {
          hasAccessToken: !!tokenSet.access_token,
          hasRefreshToken: !!tokenSet.refresh_token,
          expiresAt: tokenSet.expires_at,
          tokenType: tokenSet.token_type,
          scope: tokenSet.scope,
        },
      };

      // Test client initialization and token setting
      console.log('[Token Test] Testing client initialization');
      const xero = getXeroClient();
      xero.setTokenSet(tokenSet);

      results.checks.clientSetup = {
        success: true,
        clientInitialized: true,
        tokenSetApplied: true,
      };

      // Test token validity by checking if we can get tenants
      try {
        console.log('[Token Test] Testing tenant access');
        await xero.updateTenants();
        const tenants = xero.tenants;

        results.checks.tenantAccess = {
          success: true,
          tenantCount: tenants?.length || 0,
          tenants: tenants?.map(t => ({
            id: t.tenantId,
            name: t.tenantName,
            type: t.tenantType,
          })) || [],
        };

        // Check if our tenant ID matches
        const ourTenant = tenants?.find(t => t.tenantId === tenantId);
        results.checks.tenantMatch = {
          success: !!ourTenant,
          ourTenantId: tenantId,
          foundTenant: ourTenant ? {
            id: ourTenant.tenantId,
            name: ourTenant.tenantName,
            type: ourTenant.tenantType,
          } : null,
        };

        // Check tenant consistency - compare stored tenant with available tenants
        const storedTenantName = connection.xeroTenantName;
        const availableTenantNames = tenants?.map(t => t.tenantName) || [];

        results.checks.tenantConsistency = {
          storedTenantName,
          availableTenantNames,
          nameMatches: storedTenantName && availableTenantNames.includes(storedTenantName),
          storedTenantId: connection.xeroTenantId,
          availableTenantIds: tenants?.map(t => t.tenantId) || [],
          idMatches: connection.xeroTenantId && tenants?.some(t => t.tenantId === connection.xeroTenantId),
        };

      } catch (tenantError) {
        console.error('[Token Test] Tenant access failed:', tenantError);
        results.checks.tenantAccess = {
          success: false,
          error: tenantError instanceof Error ? tenantError.message : 'Unknown error',
        };
      }

    } catch (tokenError) {
      console.error('[Token Test] Token retrieval failed:', tokenError);
      results.checks.tokenRetrieval = {
        success: false,
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
      };
    }

    // Overall assessment
    const tokenRetrievalOk = results.checks.tokenRetrieval?.success;
    const clientSetupOk = results.checks.clientSetup?.success;
    const tenantAccessOk = results.checks.tenantAccess?.success;
    const tenantMatchOk = results.checks.tenantMatch?.success;

    const allChecksPass = tokenRetrievalOk && clientSetupOk && tenantAccessOk && tenantMatchOk;

    return NextResponse.json({
      ...results,
      status: allChecksPass ? 'TOKEN_VALID' : 'TOKEN_ISSUES',
      message: allChecksPass
        ? 'All token checks passed. Ready for API calls.'
        : 'Token or authentication issues found.',
    });

  } catch (error) {
    console.error('[Token Test] Unexpected error:', error);
    return NextResponse.json({
      ...results,
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Token test failed with unexpected error',
    }, { status: 500 });
  }
}