/**
 * Sync Operations Test Endpoint
 *
 * GET /api/xero/test/sync?orgId=org_123
 *
 * Tests basic sync operations: fetch contacts, create contact, fetch invoices
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchContactsFromXero, syncSupplierToXero } from '@/lib/xero/sync/contacts';
import { fetchInvoicesFromXero } from '@/lib/xero/sync/invoices';

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

    console.log('[Sync Test] Starting sync operations test for org:', orgId);

    // Test 1: Fetch contacts from Xero
    try {
      console.log('[Sync Test] Testing fetch contacts');
      const contactsResult = await fetchContactsFromXero(orgId, { isCustomer: true });

      results.checks.fetchContacts = {
        success: contactsResult.success,
        recordCount: contactsResult.data?.length || 0,
        error: contactsResult.error,
        message: contactsResult.success
          ? `Successfully fetched ${contactsResult.data?.length || 0} contacts`
          : `Failed to fetch contacts: ${contactsResult.error}`,
      };

      console.log(`[Sync Test] Fetch contacts result:`, results.checks.fetchContacts);

    } catch (error) {
      console.error('[Sync Test] Fetch contacts failed:', error);
      results.checks.fetchContacts = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch contacts from Xero',
      };
    }

    // Test 2: Fetch invoices from Xero
    try {
      console.log('[Sync Test] Testing fetch invoices');
      const invoicesResult = await fetchInvoicesFromXero(orgId, { type: 'ACCREC' });

      results.checks.fetchInvoices = {
        success: invoicesResult.success,
        recordCount: invoicesResult.data?.length || 0,
        error: invoicesResult.error,
        message: invoicesResult.success
          ? `Successfully fetched ${invoicesResult.data?.length || 0} invoices`
          : `Failed to fetch invoices: ${invoicesResult.error}`,
      };

      console.log(`[Sync Test] Fetch invoices result:`, results.checks.fetchInvoices);

    } catch (error) {
      console.error('[Sync Test] Fetch invoices failed:', error);
      results.checks.fetchInvoices = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch invoices from Xero',
      };
    }

    // Test 3: Create a test contact (only if fetch worked)
    if (results.checks.fetchContacts.success) {
      try {
        console.log('[Sync Test] Testing create contact');

        // Create a test supplier
        const testSupplier = {
          id: `test-${Date.now()}`,
          name: 'Test Sync Supplier',
          code: `TEST${Date.now().toString().slice(-4)}`,
          status: 'active' as const,
          contacts: [{
            id: 'test-contact-1',
            isPrimary: true,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'Contact',
          }],
          addresses: [{
            id: 'test-address-1',
            type: 'billing' as const,
            street: '123 Test Street',
            city: 'Test City',
            postalCode: '12345',
            country: 'South Africa',
          }],
        };

        const createResult = await syncSupplierToXero(orgId, testSupplier);

        results.checks.createContact = {
          success: createResult.success,
          xeroEntityId: createResult.xeroEntityId,
          error: createResult.error,
          message: createResult.success
            ? `Successfully created contact with Xero ID: ${createResult.xeroEntityId}`
            : `Failed to create contact: ${createResult.error}`,
        };

        console.log(`[Sync Test] Create contact result:`, results.checks.createContact);

      } catch (error) {
        console.error('[Sync Test] Create contact failed:', error);
        results.checks.createContact = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to create test contact in Xero',
        };
      }
    } else {
      console.log('[Sync Test] Skipping create contact test - fetch contacts failed');
      results.checks.createContact = {
        success: false,
        skipped: true,
        message: 'Skipped create contact test - fetch contacts failed',
      };
    }

    // Overall assessment
    const fetchContactsOk = results.checks.fetchContacts.success;
    const fetchInvoicesOk = results.checks.fetchInvoices.success;
    const createContactOk = results.checks.createContact.success || results.checks.createContact.skipped;

    const syncOperationsWorking = fetchContactsOk && fetchInvoicesOk && createContactOk;

    return NextResponse.json({
      ...results,
      status: syncOperationsWorking ? 'SYNC_OPERATIONS_WORKING' : 'SYNC_OPERATIONS_FAILED',
      message: syncOperationsWorking
        ? 'Basic sync operations are working correctly'
        : 'Some sync operations failed - check individual test results',
    });

  } catch (error) {
    console.error('[Sync Test] Unexpected error:', error);
    return NextResponse.json({
      ...results,
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Sync operations test failed with unexpected error',
    }, { status: 500 });
  }
}