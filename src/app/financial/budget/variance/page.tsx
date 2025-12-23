/**
 * Budget - Variance Analysis Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface VarianceItem {
  account: string;
  budget: number;
  actual: number;
  variance: number;
  variance_percent: number;
}

export default function BudgetVariancePage() {
  const [data, setData] = useState<VarianceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVariance() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/budget/variance?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data || []);
        } else {
          setData([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching variance:', err);
        setData([]);
        setLoading(false);
      }
    }

    fetchVariance();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  return (
    <AppLayout
      title="Budget Variance"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Budget', href: '/financial/budget/versions' },
        { label: 'Variance Analysis' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Compare budget vs actual performance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Variance Analysis</CardTitle>
            <CardDescription>Budget to actual comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading variance data...</div>
            ) : data.length === 0 ? (
              <div className="text-sm text-muted-foreground">No variance data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Account</th>
                      <th className="text-right p-2">Budget</th>
                      <th className="text-right p-2">Actual</th>
                      <th className="text-right p-2">Variance</th>
                      <th className="text-right p-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{item.account}</td>
                        <td className="text-right p-2">{formatCurrency(item.budget)}</td>
                        <td className="text-right p-2">{formatCurrency(item.actual)}</td>
                        <td
                          className={`text-right p-2 ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {formatCurrency(item.variance)}
                        </td>
                        <td
                          className={`text-right p-2 ${item.variance_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {item.variance_percent >= 0 ? '+' : ''}
                          {item.variance_percent.toFixed(1)}%
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

