/**
 * Fixed Assets - Depreciation Schedule Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DepreciationItem {
  asset_id: string;
  asset_name: string;
  original_cost: number;
  accumulated_depreciation: number;
  net_book_value: number;
  depreciation_method: string;
  useful_life_years: number;
  monthly_depreciation: number;
}

export default function DepreciationPage() {
  const [data, setData] = useState<DepreciationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDepreciation() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/assets/depreciation?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data || []);
        } else {
          setData([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching depreciation:', err);
        setData([]);
        setLoading(false);
      }
    }

    fetchDepreciation();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const totals = data.reduce(
    (acc, item) => ({
      original_cost: acc.original_cost + item.original_cost,
      accumulated_depreciation: acc.accumulated_depreciation + item.accumulated_depreciation,
      net_book_value: acc.net_book_value + item.net_book_value,
      monthly_depreciation: acc.monthly_depreciation + item.monthly_depreciation,
    }),
    { original_cost: 0, accumulated_depreciation: 0, net_book_value: 0, monthly_depreciation: 0 }
  );

  return (
    <AppLayout
      title="Depreciation Schedule"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Fixed Assets', href: '/financial/assets/register' },
        { label: 'Depreciation' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Asset depreciation schedule and calculations</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Depreciation Schedule</CardTitle>
            <CardDescription>Asset depreciation details</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading depreciation data...</div>
            ) : data.length === 0 ? (
              <div className="text-sm text-muted-foreground">No depreciation data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Asset</th>
                      <th className="text-right p-2">Original Cost</th>
                      <th className="text-right p-2">Accum. Depr.</th>
                      <th className="text-right p-2">Net Book Value</th>
                      <th className="text-center p-2">Method</th>
                      <th className="text-right p-2">Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => (
                      <tr key={item.asset_id} className="border-b">
                        <td className="p-2">{item.asset_name}</td>
                        <td className="text-right p-2">{formatCurrency(item.original_cost)}</td>
                        <td className="text-right p-2">{formatCurrency(item.accumulated_depreciation)}</td>
                        <td className="text-right p-2">{formatCurrency(item.net_book_value)}</td>
                        <td className="text-center p-2 text-sm">{item.depreciation_method}</td>
                        <td className="text-right p-2">{formatCurrency(item.monthly_depreciation)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold">
                      <td className="p-2">Total</td>
                      <td className="text-right p-2">{formatCurrency(totals.original_cost)}</td>
                      <td className="text-right p-2">{formatCurrency(totals.accumulated_depreciation)}</td>
                      <td className="text-right p-2">{formatCurrency(totals.net_book_value)}</td>
                      <td className="text-center p-2">-</td>
                      <td className="text-right p-2">{formatCurrency(totals.monthly_depreciation)}</td>
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

