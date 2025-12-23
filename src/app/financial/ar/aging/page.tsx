/**
 * Accounts Receivable - Aging Report Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AgingReportItem {
  customer_id: string;
  customer_name?: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  total: number;
}

export default function ARAgingPage() {
  const [agingData, setAgingData] = useState<AgingReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgingReport() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/ar/aging?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setAgingData(result.data || []);
        } else {
          setError(result.error || 'Failed to fetch aging report');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching aging report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load aging report');
        setLoading(false);
      }
    }

    fetchAgingReport();
  }, []);

  const totals = agingData.reduce(
    (acc, item) => ({
      current: acc.current + item.current,
      days_1_30: acc.days_1_30 + item.days_1_30,
      days_31_60: acc.days_31_60 + item.days_31_60,
      days_61_90: acc.days_61_90 + item.days_61_90,
      days_over_90: acc.days_over_90 + item.days_over_90,
      total: acc.total + item.total,
    }),
    { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0, total: 0 }
  );

  return (
    <AppLayout
      title="AR Aging Report"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Accounts Receivable', href: '/financial/ar/invoices' },
        { label: 'Aging Report' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Accounts receivable aging analysis by customer</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aging Report</CardTitle>
            <CardDescription>Outstanding amounts by aging bucket</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading aging report...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Error: {error}</div>
            ) : agingData.length === 0 ? (
              <div className="text-sm text-muted-foreground">No aging data found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Customer</th>
                      <th className="text-right p-2">Current</th>
                      <th className="text-right p-2">1-30 Days</th>
                      <th className="text-right p-2">31-60 Days</th>
                      <th className="text-right p-2">61-90 Days</th>
                      <th className="text-right p-2">90+ Days</th>
                      <th className="text-right p-2 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingData.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{item.customer_name || item.customer_id}</td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.current)}
                        </td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.days_1_30)}
                        </td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.days_31_60)}
                        </td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.days_61_90)}
                        </td>
                        <td className="text-right p-2 text-destructive">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.days_over_90)}
                        </td>
                        <td className="text-right p-2 font-medium">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold">
                      <td className="p-2">Total</td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.current)}
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.days_1_30)}
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.days_31_60)}
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.days_61_90)}
                      </td>
                      <td className="text-right p-2 text-destructive">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.days_over_90)}
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.total)}
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

