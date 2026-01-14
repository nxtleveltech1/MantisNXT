/**
 * API Call Test Endpoint
 *
 * GET /api/xero/test/api-call?orgId=org_123
 *
 * Tests making actual API calls to Xero using the current method signatures
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getValidTokenSet, getXeroClient } from '@/lib/xero/client';
import { callXeroApi } from '@/lib/xero/rate-limiter';

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

    console.log('[API Test] Starting API call test for org:', orgId);

    // Test 1: Get organisation (simplest API call)
    try {
      console.log('[API Test] Testing getOrganisation call');
      const { tokenSet, tenantId } = await getValidTokenSet(orgId);
      const xero = getXeroClient();
      xero.setTokenSet(tokenSet);

      const orgResponse = await callXeroApi(tenantId, async () => {
        console.log('[API Test] Calling getOrganisation API');
        return xero.accountingApi.getOrganisations(tenantId);
      });

      console.log('[API Test] Organisation response received');
      results.checks.getOrganisation = {
        success: true,
        responseStructure: {
          hasOrganisations: !!orgResponse.body.organisations,
          orgCount: orgResponse.body.organisations?.length || 0,
          responseKeys: Object.keys(orgResponse.body),
        },
        organisation: orgResponse.body.organisations?.[0] ? {
          name: orgResponse.body.organisations[0].name,
          shortCode: orgResponse.body.organisations[0].shortCode,
          countryCode: orgResponse.body.organisations[0].countryCode,
        } : null,
      };

    } catch (error) {
      console.error('[API Test] getOrganisation failed:', error);
      results.checks.getOrganisation = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name || 'Unknown',
      };
    }

    // Test 2: Get accounts (chart of accounts)
    try {
      console.log('[API Test] Testing getAccounts call');
      const { tokenSet, tenantId } = await getValidTokenSet(orgId);
      const xero = getXeroClient();
      xero.setTokenSet(tokenSet);

      const accountsResponse = await callXeroApi(tenantId, async () => {
        console.log('[API Test] Calling getAccounts API');
        return xero.accountingApi.getAccounts(tenantId);
      });

      console.log('[API Test] Accounts response received');
      results.checks.getAccounts = {
        success: true,
        responseStructure: {
          hasAccounts: !!accountsResponse.body.accounts,
          accountCount: accountsResponse.body.accounts?.length || 0,
          responseKeys: Object.keys(accountsResponse.body),
        },
        sampleAccount: accountsResponse.body.accounts?.[0] ? {
          code: accountsResponse.body.accounts[0].code,
          name: accountsResponse.body.accounts[0].name,
          type: accountsResponse.body.accounts[0].type,
        } : null,
      };

    } catch (error) {
      console.error('[API Test] getAccounts failed:', error);
      results.checks.getAccounts = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name || 'Unknown',
      };
    }

    // Test 3: Get contacts (minimal call)
    try {
      console.log('[API Test] Testing getContacts call');
      const { tokenSet, tenantId } = await getValidTokenSet(orgId);
      const xero = getXeroClient();
      xero.setTokenSet(tokenSet);

      const contactsResponse = await callXeroApi(tenantId, async () => {
        console.log('[API Test] Calling getContacts API');
        return xero.accountingApi.getContacts(tenantId);
      });

      console.log('[API Test] Contacts response received');
      results.checks.getContacts = {
        success: true,
        responseStructure: {
          hasContacts: !!contactsResponse.body.contacts,
          contactCount: contactsResponse.body.contacts?.length || 0,
          responseKeys: Object.keys(contactsResponse.body),
        },
      };

    } catch (error) {
      console.error('[API Test] getContacts failed:', error);
      results.checks.getContacts = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name || 'Unknown',
      };
    }

    // Overall assessment
    const orgSuccess = results.checks.getOrganisation?.success;
    const accountsSuccess = results.checks.getAccounts?.success;
    const contactsSuccess = results.checks.getContacts?.success;

    const allTestsPass = orgSuccess && accountsSuccess && contactsSuccess;

    return NextResponse.json({
      ...results,
      status: allTestsPass ? 'API_WORKING' : 'API_ISSUES',
      message: allTestsPass
        ? 'All API calls succeeded. Xero integration is working.'
        : 'Some API calls failed. Check error details.',
    });

  } catch (error) {
    console.error('[API Test] Unexpected error:', error);
    return NextResponse.json({
      ...results,
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'API test failed with unexpected error',
    }, { status: 500 });
  }
}