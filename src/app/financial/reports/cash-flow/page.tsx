/**
 * Financial Reports - Cash Flow Statement Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CashFlowData {
  operating_activities: {
    items: Array<{ name: string; amount: number }>;
    total: number;
  };
  investing_activities: {
    items: Array<{ name: string; amount: number }>;
    total: number;
  };
  financing_activities: {
    items: Array<{ name: string; amount: number }>;
    total: number;
  };
  net_change: number;
  opening_cash: number;
  closing_cash: number;
}

export default function CashFlowPage() {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCashFlow() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/reports/cash-flow?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setData(null);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching cash flow:', err);
        setData(null);
        setLoading(false);
      }
    }

    fetchCashFlow();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  return (
    <AppLayout
      title="Cash Flow Statement"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Reports', href: '/financial/reports/balance-sheet' },
        { label: 'Cash Flow' },
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Statement of cash flows for the current period</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Statement</CardTitle>
            <CardDescription>Cash inflows and outflows by activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading cash flow statement...</div>
            ) : !data ? (
              <div className="text-sm text-muted-foreground">No cash flow data available</div>
            ) : (
              <div className="space-y-6">
                {/* Operating Activities */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Operating Activities</h3>
                  {data.operating_activities.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 pl-4">
                      <span>{item.name}</span>
                      <span className={item.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t">
                    <span>Net Cash from Operating</span>
                    <span>{formatCurrency(data.operating_activities.total)}</span>
                  </div>
                </div>

                {/* Investing Activities */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Investing Activities</h3>
                  {data.investing_activities.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 pl-4">
                      <span>{item.name}</span>
                      <span className={item.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t">
                    <span>Net Cash from Investing</span>
                    <span>{formatCurrency(data.investing_activities.total)}</span>
                  </div>
                </div>

                {/* Financing Activities */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Financing Activities</h3>
                  {data.financing_activities.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 pl-4">
                      <span>{item.name}</span>
                      <span className={item.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t">
                    <span>Net Cash from Financing</span>
                    <span>{formatCurrency(data.financing_activities.total)}</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-2 border-t-2 pt-4">
                  <div className="flex justify-between py-1">
                    <span>Net Change in Cash</span>
                    <span className={data.net_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(data.net_change)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Opening Cash Balance</span>
                    <span>{formatCurrency(data.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-lg border-t">
                    <span>Closing Cash Balance</span>
                    <span>{formatCurrency(data.closing_cash)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

