/**
 * Connection Test Endpoint
 *
 * GET /api/xero/test/connection
 *
 * Tests basic Xero connection setup and client initialization
 */

import { NextRequest, NextResponse } from 'next/server';
import { isXeroConfigured, getXeroClient } from '@/lib/xero/client';
import { hasActiveConnection } from '@/lib/xero/token-manager';

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, any>,
  };

  try {
    // Check 1: Environment configuration
    const configured = isXeroConfigured();
    results.checks.config = {
      configured,
      message: configured ? 'Xero environment variables are set' : 'Xero environment variables are missing',
    };

    // Check 2: Client initialization
    let clientInitialized = false;
    try {
      const client = getXeroClient();
      clientInitialized = Boolean(client);
      results.checks.client = {
        initialized: clientInitialized,
        message: clientInitialized ? 'XeroClient initialized successfully' : 'Failed to initialize XeroClient',
      };
    } catch (error) {
      results.checks.client = {
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to initialize XeroClient',
      };
    }

    // Check 3: Database connection (if configured)
    if (configured) {
      try {
        const searchParams = request.nextUrl.searchParams;
        const orgId = searchParams.get('orgId');

        if (orgId) {
          const hasConnection = await hasActiveConnection(orgId);
          results.checks.database = {
            checked: true,
            hasConnection,
            message: hasConnection ? 'Active Xero connection found in database' : 'No active Xero connection found',
          };
        } else {
          results.checks.database = {
            checked: false,
            message: 'Provide orgId parameter to check database connection',
          };
        }
      } catch (error) {
        results.checks.database = {
          checked: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to check database connection',
        };
      }
    }

    // Overall status
    const allChecksPass = Object.values(results.checks).every(check =>
      check.checked !== false && !check.error
    );

    return NextResponse.json({
      ...results,
      status: allChecksPass ? 'READY' : 'ISSUES_FOUND',
      message: allChecksPass
        ? 'All basic checks passed. Ready for OAuth flow.'
        : 'Issues found that need to be resolved.',
    });

  } catch (error) {
    return NextResponse.json({
      ...results,
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Connection test failed with error',
    }, { status: 500 });
  }
}