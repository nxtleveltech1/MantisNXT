/**
 * General Ledger - Chart of Accounts Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_account_code?: string;
  is_active: boolean;
  current_balance: number;
  normal_balance: 'debit' | 'credit';
  description?: string;
}

export default function GLAccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        // Note: This endpoint may not exist yet, but we'll create a placeholder
        const response = await fetch(`/api/v1/financial/gl/accounts?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setAccounts(result.data || []);
        } else {
          // If endpoint doesn't exist, just show empty state
          setAccounts([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        // Don't show error if endpoint doesn't exist
        setAccounts([]);
        setLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  return (
    <AppLayout
      title="Chart of Accounts"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'General Ledger', href: '/financial/gl/accounts' },
        { label: 'Chart of Accounts' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage general ledger accounts</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chart of Accounts</CardTitle>
            <CardDescription>List of general ledger accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading accounts...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Error: {error}</div>
            ) : accounts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No accounts found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Account Code</th>
                      <th className="text-left p-2">Account Name</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Normal Balance</th>
                      <th className="text-right p-2">Balance</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-b">
                        <td className="p-2 font-mono">{account.account_code}</td>
                        <td className="p-2">{account.account_name}</td>
                        <td className="p-2">{account.account_type}</td>
                        <td className="p-2 capitalize">{account.normal_balance}</td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(account.current_balance)}
                        </td>
                        <td className="p-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              account.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {account.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

