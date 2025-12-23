/**
 * Tax - Tax Returns Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface TaxReturn {
  id: string;
  return_type: string;
  period: string;
  due_date: string;
  filed_date?: string;
  status: string;
  amount_due: number;
  amount_paid: number;
}

export default function TaxReturnsPage() {
  const [returns, setReturns] = useState<TaxReturn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReturns() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/tax/returns?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setReturns(result.data || []);
        } else {
          setReturns([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tax returns:', err);
        setReturns([]);
        setLoading(false);
      }
    }

    fetchReturns();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      filed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AppLayout
      title="Tax Returns"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Tax', href: '/financial/tax/config' },
        { label: 'Returns' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage tax returns and filings</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Return
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tax Returns</CardTitle>
            <CardDescription>List of tax returns and filings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading tax returns...</div>
            ) : returns.length === 0 ? (
              <div className="text-sm text-muted-foreground">No tax returns found</div>
            ) : (
              <div className="space-y-2">
                {returns.map((ret) => (
                  <div key={ret.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ret.return_type}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(ret.status)}`}>
                          {ret.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Period: {ret.period} | Due: {new Date(ret.due_date).toLocaleDateString()}
                        {ret.filed_date && ` | Filed: ${new Date(ret.filed_date).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(ret.amount_due)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Paid:{' '}
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(ret.amount_paid)}
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

