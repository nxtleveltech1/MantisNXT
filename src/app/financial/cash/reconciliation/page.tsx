/**
 * Cash Management - Bank Reconciliation Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { buildClientXeroUrl, getClientXeroHeaders } from '@/lib/xero/client-org';

interface Reconciliation {
  id: string;
  bank_account_id: string;
  bank_account_name: string;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  difference: number;
  status: string;
}

export default function BankReconciliationPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [xeroTransactions, setXeroTransactions] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [xeroLoading, setXeroLoading] = useState(false);

  useEffect(() => {
    async function fetchReconciliations() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/cash/reconciliation?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setReconciliations(result.data || []);
        } else {
          setReconciliations([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reconciliations:', err);
        setReconciliations([]);
        setLoading(false);
      }
    }

    void fetchReconciliations();
  }, []);

  async function fetchFromXero() {
    if (!xeroConnected) return;
    setXeroLoading(true);
    try {
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const response = await fetch(
        buildClientXeroUrl(
          `/api/xero/bank-transactions?fromDate=${from.toISOString().split('T')[0]}&toDate=${new Date().toISOString().split('T')[0]}`
        ),
        { headers: getClientXeroHeaders() }
      );
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setXeroTransactions(result.data);
      } else {
        setXeroTransactions([]);
      }
    } catch (err) {
      console.error('Error fetching Xero bank transactions:', err);
      setXeroTransactions([]);
    } finally {
      setXeroLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AppLayout
      title="Bank Reconciliation"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Cash Management', href: '/financial/cash/bank-accounts' },
        { label: 'Reconciliation' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Reconcile bank statements with book records</p>
          </div>
          <div className="flex items-center gap-2">
            {xeroConnected && (
              <Button variant="outline" onClick={fetchFromXero} disabled={xeroLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${xeroLoading ? 'animate-spin' : ''}`} />
                {xeroLoading ? 'Loading...' : 'Fetch from Xero'}
              </Button>
            )}
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Reconciliation
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliations</CardTitle>
            <CardDescription>Bank reconciliation history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading reconciliations...</div>
            ) : reconciliations.length === 0 ? (
              <div className="text-sm text-muted-foreground">No reconciliations found</div>
            ) : (
              <div className="space-y-2">
                {reconciliations.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-medium">{rec.bank_account_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Statement Date: {new Date(rec.statement_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        Difference:{' '}
                        <span className={rec.difference === 0 ? 'text-green-600' : 'text-red-600'}>
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(rec.difference)}
                        </span>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${getStatusBadge(rec.status)}`}>
                        {rec.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {xeroTransactions !== null && (
          <Card>
            <CardHeader>
              <CardTitle>Bank transactions (from Xero)</CardTitle>
              <CardDescription>Use for matching with book records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {xeroTransactions.length === 0
                  ? 'No bank transactions in date range.'
                  : `${xeroTransactions.length} transaction(s) loaded from Xero.`}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
