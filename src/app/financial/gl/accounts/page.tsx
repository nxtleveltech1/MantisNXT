/**
 * General Ledger - Chart of Accounts Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { buildClientXeroUrl, getClientXeroHeaders } from '@/lib/xero/client-org';

type ListSource = 'nxt' | 'xero';

interface AccountRow {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance?: string;
  current_balance: number;
  is_active: boolean;
}

export default function GLAccountsPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [source, setSource] = useState<ListSource>('nxt');
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      setError(null);
      try {
        if (source === 'xero') {
          const response = await fetch(buildClientXeroUrl('/api/xero/accounts'), {
            headers: getClientXeroHeaders(),
          });
          const result = await response.json();
          if (result.success && Array.isArray(result.accounts)) {
            setAccounts(
              result.accounts.map((a: { id?: string; code?: string; name?: string; type?: string; status?: string }) => ({
                id: a.id ?? '',
                account_code: a.code ?? '-',
                account_name: a.name ?? '-',
                account_type: a.type ?? '-',
                current_balance: 0,
                is_active: a.status === 'ACTIVE',
              }))
            );
          } else {
            setError(result.error || 'Failed to fetch from Xero');
            setAccounts([]);
          }
        } else {
          const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
          const response = await fetch(`/api/v1/financial/gl/accounts?org_id=${orgId}`);
          const result = await response.json();
          if (response.ok && result.success !== false && Array.isArray(result.data)) {
            setAccounts(result.data);
          } else {
            setAccounts([]);
          }
        }
      } catch (err) {
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, [source]);

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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Manage general ledger accounts</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="gl-source" className="text-sm text-muted-foreground">
              Source
            </Label>
            <Select value={source} onValueChange={(v) => setSource(v as ListSource)}>
              <SelectTrigger id="gl-source" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nxt">NXT</SelectItem>
                {xeroConnected && <SelectItem value="xero">Xero</SelectItem>}
              </SelectContent>
            </Select>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Account
            </Button>
          </div>
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
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Account Code</th>
                      <th className="text-left p-2">Account Name</th>
                      <th className="text-left p-2">Type</th>
                      {source === 'nxt' && (
                        <>
                          <th className="text-left p-2">Normal Balance</th>
                          <th className="text-right p-2">Balance</th>
                        </>
                      )}
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-b border-border">
                        <td className="p-2 font-mono">{account.account_code}</td>
                        <td className="p-2">{account.account_name}</td>
                        <td className="p-2">{account.account_type}</td>
                        {source === 'nxt' && (
                          <>
                            <td className="p-2 capitalize">{account.normal_balance ?? '-'}</td>
                            <td className="text-right p-2">
                              {new Intl.NumberFormat('en-ZA', {
                                style: 'currency',
                                currency: 'ZAR',
                              }).format(account.current_balance)}
                            </td>
                          </>
                        )}
                        <td className="p-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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


