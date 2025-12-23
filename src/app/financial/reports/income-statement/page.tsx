/**
 * Financial Reports - Income Statement Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface IncomeStatementData {
  revenue: {
    items: Array<{ name: string; amount: number }>;
    total: number;
  };
  cost_of_sales: {
    items: Array<{ name: string; amount: number }>;
    total: number;
  };
  gross_profit: number;
  operating_expenses: {
    items: Array<{ name: string; amount: number }>;
    total: number;
  };
  operating_income: number;
  other_income: number;
  other_expenses: number;
  net_income: number;
}

export default function IncomeStatementPage() {
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIncomeStatement() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/reports/income-statement?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setData(null);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching income statement:', err);
        setData(null);
        setLoading(false);
      }
    }

    fetchIncomeStatement();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  return (
    <AppLayout
      title="Income Statement"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Reports', href: '/financial/reports/balance-sheet' },
        { label: 'Income Statement' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Profit and loss statement for the current period</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Income Statement</CardTitle>
            <CardDescription>Revenue and expenses summary</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading income statement...</div>
            ) : !data ? (
              <div className="text-sm text-muted-foreground">No income statement data available</div>
            ) : (
              <div className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Revenue</h3>
                  {data.revenue.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 pl-4">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t">
                    <span>Total Revenue</span>
                    <span>{formatCurrency(data.revenue.total)}</span>
                  </div>
                </div>

                {/* Cost of Sales */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Cost of Sales</h3>
                  {data.cost_of_sales.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 pl-4">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t">
                    <span>Total Cost of Sales</span>
                    <span>{formatCurrency(data.cost_of_sales.total)}</span>
                  </div>
                </div>

                {/* Gross Profit */}
                <div className="flex justify-between py-2 font-bold text-lg border-t-2">
                  <span>Gross Profit</span>
                  <span>{formatCurrency(data.gross_profit)}</span>
                </div>

                {/* Operating Expenses */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Operating Expenses</h3>
                  {data.operating_expenses.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 pl-4">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t">
                    <span>Total Operating Expenses</span>
                    <span>{formatCurrency(data.operating_expenses.total)}</span>
                  </div>
                </div>

                {/* Operating Income */}
                <div className="flex justify-between py-2 font-bold text-lg border-t-2">
                  <span>Operating Income</span>
                  <span>{formatCurrency(data.operating_income)}</span>
                </div>

                {/* Net Income */}
                <div className="flex justify-between py-3 font-bold text-xl border-t-4 bg-muted/50 px-2 rounded">
                  <span>Net Income</span>
                  <span className={data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(data.net_income)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

