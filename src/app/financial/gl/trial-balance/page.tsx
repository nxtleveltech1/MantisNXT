/**
 * General Ledger - Trial Balance Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TrialBalanceItem {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export default function TrialBalancePage() {
  const [data, setData] = useState<TrialBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrialBalance() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/gl/trial-balance?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data || []);
        } else {
          setData([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching trial balance:', err);
        setData([]);
        setLoading(false);
      }
    }

    fetchTrialBalance();
  }, []);

  const totals = data.reduce(
    (acc, item) => ({
      debit: acc.debit + item.debit,
      credit: acc.credit + item.credit,
    }),
    { debit: 0, credit: 0 }
  );

  return (
    <AppLayout
      title="Trial Balance"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'General Ledger', href: '/financial/gl/accounts' },
        { label: 'Trial Balance' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Trial balance report showing debits and credits</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trial Balance</CardTitle>
            <CardDescription>Account balances as of current date</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading trial balance...</div>
            ) : data.length === 0 ? (
              <div className="text-sm text-muted-foreground">No trial balance data found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Account Code</th>
                      <th className="text-left p-2">Account Name</th>
                      <th className="text-right p-2">Debit</th>
                      <th className="text-right p-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 font-mono">{item.account_code}</td>
                        <td className="p-2">{item.account_name}</td>
                        <td className="text-right p-2">
                          {item.debit > 0
                            ? new Intl.NumberFormat('en-ZA', {
                                style: 'currency',
                                currency: 'ZAR',
                              }).format(item.debit)
                            : '-'}
                        </td>
                        <td className="text-right p-2">
                          {item.credit > 0
                            ? new Intl.NumberFormat('en-ZA', {
                                style: 'currency',
                                currency: 'ZAR',
                              }).format(item.credit)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold">
                      <td className="p-2" colSpan={2}>
                        Total
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.debit)}
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.credit)}
                      </td>
                    </tr>
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

