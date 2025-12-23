/**
 * Cash Management - Bank Reconciliation Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);

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

    fetchReconciliations();
  }, []);

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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Reconciliation
          </Button>
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
                  <div key={rec.id} className="flex items-center justify-between p-3 border rounded">
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
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(rec.status)}`}>
                        {rec.status.replace('_', ' ')}
                      </span>
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

