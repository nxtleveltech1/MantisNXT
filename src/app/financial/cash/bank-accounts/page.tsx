/**
 * Cash Management - Bank Accounts Page
 */

'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useXeroConnection } from '@/hooks/useXeroConnection';

interface XeroBankAccount {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  status?: string;
}

export default function BankAccountsPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [xeroAccounts, setXeroAccounts] = useState<XeroBankAccount[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadFromXero() {
    if (!xeroConnected) return;
    setLoading(true);
    try {
      const response = await fetch('/api/xero/accounts');
      const result = await response.json();
      if (result.success && Array.isArray(result.accounts)) {
        setXeroAccounts(result.accounts.filter((a: XeroBankAccount) => a.type === 'BANK'));
      } else {
        setXeroAccounts([]);
      }
    } catch (err) {
      console.error('Error fetching Xero bank accounts:', err);
      setXeroAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout
      title="Bank Accounts"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Cash Management', href: '/financial/cash/bank-accounts' },
        { label: 'Bank Accounts' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Manage bank accounts</p>
          {xeroConnected && (
            <Button variant="outline" onClick={loadFromXero} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load from Xero'}
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts</CardTitle>
            <CardDescription>List of bank accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {xeroAccounts !== null && xeroAccounts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Code</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xeroAccounts.map((acc, idx) => (
                      <tr key={acc.id ?? idx} className="border-b">
                        <td className="p-2 font-mono">{acc.code ?? '-'}</td>
                        <td className="p-2">{acc.name ?? '-'}</td>
                        <td className="p-2">{acc.status ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {xeroAccounts !== null && xeroAccounts.length === 0
                  ? 'No bank accounts in Xero.'
                  : 'Click "Load from Xero" to see bank accounts from your connected Xero organization.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

