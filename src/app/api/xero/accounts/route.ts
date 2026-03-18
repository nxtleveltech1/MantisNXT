/**
 * Xero Chart of Accounts
 * 
 * GET /api/xero/accounts
 * 
 * Fetches the Chart of Accounts from connected Xero organization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getXeroClient } from '@/lib/xero/client';
import { getValidTokenSet } from '@/lib/xero/token-manager';
import { callXeroApi } from '@/lib/xero/rate-limiter';
import { handleApiError } from '@/lib/xero/errors';
import type { XeroAccount } from '@/lib/xero/types';
import { validateXeroRequest } from '@/lib/xero/validation';

export async function GET(request: NextRequest) {
  try {
    const validation = await validateXeroRequest(request, true);
    if (validation.error) return validation.error;
    const { orgId } = validation;

    // Get valid token set
    const { tokenSet, tenantId } = await getValidTokenSet(orgId);
    
    const xero = getXeroClient();
    xero.setTokenSet(tokenSet);

    // Fetch accounts
    const response = await callXeroApi(tenantId, async () => {
      return xero.accountingApi.getAccounts(tenantId);
    });

    const accounts = (response.body.accounts || []) as XeroAccount[];

    // Group accounts by type for easier consumption
    const groupedAccounts = accounts.reduce((acc, account) => {
      const type = account.Type || 'OTHER';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        id: account.AccountID,
        code: account.Code,
        name: account.Name,
        type: account.Type,
        status: account.Status,
        class: account.Class,
        taxType: account.TaxType,
        description: account.Description,
      });
      return acc;
    }, {} as Record<string, Array<{
      id?: string;
      code?: string;
      name?: string;
      type?: string;
      status?: string;
      class?: string;
      taxType?: string;
      description?: string;
    }>>);

    return NextResponse.json({
      success: true,
      accounts: accounts.map(a => ({
        id: a.AccountID,
        code: a.Code,
        name: a.Name,
        type: a.Type,
        status: a.Status,
        class: a.Class,
        taxType: a.TaxType,
        description: a.Description,
      })),
      grouped: groupedAccounts,
      total: accounts.length,
    });

  } catch (error) {
    return handleApiError(error, 'Xero Accounts');
  }
}
