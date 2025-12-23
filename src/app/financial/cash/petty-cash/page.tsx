/**
 * Cash Management - Petty Cash Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface PettyCashTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'in' | 'out';
  balance_after: number;
  created_by: string;
}

export default function PettyCashPage() {
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function fetchPettyCash() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/cash/petty-cash?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setTransactions(result.data?.transactions || []);
          setBalance(result.data?.balance || 0);
        } else {
          setTransactions([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching petty cash:', err);
        setTransactions([]);
        setLoading(false);
      }
    }

    fetchPettyCash();
  }, []);

  return (
    <AppLayout
      title="Petty Cash"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Cash Management', href: '/financial/cash/bank-accounts' },
        { label: 'Petty Cash' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage petty cash transactions</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Petty Cash Balance</CardTitle>
            <CardDescription>Current petty cash on hand</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
              }).format(balance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Petty cash transaction history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No transactions found</div>
            ) : (
              <div className="space-y-2">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{txn.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(txn.date).toLocaleDateString()} | By: {txn.created_by}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${txn.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'in' ? '+' : '-'}
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(txn.amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Balance:{' '}
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(txn.balance_after)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

