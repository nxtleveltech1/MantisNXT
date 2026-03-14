/**
 * Cash Management - Bank Accounts Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useXeroConnection } from '@/hooks/useXeroConnection';

type ListSource = 'nxt' | 'xero';

interface BankAccountRow {
  id: string;
  code: string;
  name: string;
  status?: string;
}

export default function BankAccountsPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [source, setSource] = useState<ListSource>('nxt');
  const [accounts, setAccounts] = useState<BankAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      setError(null);
      try {
        if (source === 'xero') {
          const response = await fetch('/api/xero/accounts');
          const result = await response.json();
          if (result.success && Array.isArray(result.accounts)) {
            const bank = result.accounts.filter((a: { type?: string }) => a.type === 'BANK');
            setAccounts(
              bank.map((a: { id?: string; code?: string; name?: string; status?: string }) => ({
                id: a.id ?? '',
                code: a.code ?? '-',
                name: a.name ?? '-',
                status: a.status,
              }))
            );
          } else {
            setError(result.error || 'Failed to fetch from Xero');
            setAccounts([]);
          }
        } else {
          const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
          const response = await fetch(`/api/v1/financial/cash/bank-accounts?org_id=${orgId}`);
          const result = await response.json();
          if (response.ok && !result.error && Array.isArray(result.data)) {
            setAccounts(
              result.data.map((a: { id: string; account_code?: string; account_name?: string; status?: string }) => ({
                id: a.id,
                code: a.account_code ?? '-',
                name: a.account_name ?? '-',
                status: a.status,
              }))
            );
          } else {
            setAccounts([]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, [source]);

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
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground">Manage bank accounts</p>
          <div className="flex items-center gap-2">
            <Label htmlFor="bank-source" className="text-sm text-muted-foreground">
              Source
            </Label>
            <Select value={source} onValueChange={(v) => setSource(v as ListSource)}>
              <SelectTrigger id="bank-source" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nxt">NXT</SelectItem>
                {xeroConnected && <SelectItem value="xero">Xero</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts</CardTitle>
            <CardDescription>List of bank accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Error: {error}</div>
            ) : accounts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {source === 'xero' ? 'No bank accounts in Xero.' : 'No bank accounts found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Code</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="border-b border-border">
                        <td className="p-2 font-mono">{acc.code}</td>
                        <td className="p-2">{acc.name}</td>
                        <td className="p-2">{acc.status ?? '-'}</td>
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

