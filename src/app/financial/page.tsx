/**
 * Financial Dashboard
 * Overview cards, metrics charts, recent transactions, aging summaries
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface DashboardData {
  ap_balance: number;
  ar_balance: number;
  cash_balance: number;
  net_income: number;
  ar_aging: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_over_90: number;
  };
  ap_aging: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_over_90: number;
  };
}

export default function FinancialDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Get org_id from context or localStorage (you may need to adjust this)
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        
        // Fetch AR aging report
        const arAgingResponse = await fetch(`/api/v1/financial/ar/aging?org_id=${orgId}`);
        const arAgingData = await arAgingResponse.json();
        
        // Fetch AP aging report
        const apAgingResponse = await fetch(`/api/v1/financial/ap/aging?org_id=${orgId}`);
        const apAgingData = await apAgingResponse.json();

        // Calculate totals from aging reports
        const arAging = arAgingData.success && arAgingData.data.length > 0
          ? arAgingData.data.reduce((acc: any, item: any) => ({
              current: acc.current + item.current,
              days_1_30: acc.days_1_30 + item.days_1_30,
              days_31_60: acc.days_31_60 + item.days_31_60,
              days_61_90: acc.days_61_90 + item.days_61_90,
              days_over_90: acc.days_over_90 + item.days_over_90,
            }), { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0 })
          : { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0 };

        const apAging = apAgingData.success && apAgingData.data.length > 0
          ? apAgingData.data.reduce((acc: any, item: any) => ({
              current: acc.current + item.current,
              days_1_30: acc.days_1_30 + item.days_1_30,
              days_31_60: acc.days_31_60 + item.days_31_60,
              days_61_90: acc.days_61_90 + item.days_61_90,
              days_over_90: acc.days_over_90 + item.days_over_90,
            }), { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0 })
          : { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0 };

        setData({
          ap_balance: apAging.current + apAging.days_1_30 + apAging.days_31_60 + apAging.days_61_90 + apAging.days_over_90,
          ar_balance: arAging.current + arAging.days_1_30 + arAging.days_31_60 + arAging.days_61_90 + arAging.days_over_90,
          cash_balance: 0, // Would fetch from cash management API
          net_income: 0, // Would fetch from income statement
          ar_aging,
          ap_aging,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const overviewData = data || {
    ap_balance: 0,
    ar_balance: 0,
    cash_balance: 0,
    net_income: 0,
    ar_aging: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0 },
    ap_aging: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0 },
  };

  if (loading) {
    return (
      <AppLayout title="Financial Dashboard" breadcrumbs={[{ label: 'Financial', href: '/financial' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Financial Dashboard" breadcrumbs={[{ label: 'Financial', href: '/financial' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">Error: {error}</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Financial Dashboard" breadcrumbs={[{ label: 'Financial', href: '/financial' }]}>
      <div className="space-y-4">

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accounts Payable</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
              }).format(overviewData.ap_balance)}
            </div>
            <p className="text-xs text-muted-foreground">Total outstanding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
              }).format(overviewData.ar_balance)}
            </div>
            <p className="text-xs text-muted-foreground">Total outstanding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
              }).format(overviewData.cash_balance)}
            </div>
            <p className="text-xs text-muted-foreground">Current balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
              }).format(overviewData.net_income)}
            </div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Transactions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Revenue over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - Revenue trend visualization
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest financial transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                No recent transactions
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Summaries */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AR Aging Summary</CardTitle>
            <CardDescription>Accounts Receivable aging buckets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ar_aging.current)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>1-30 days</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ar_aging.days_1_30)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>31-60 days</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ar_aging.days_31_60)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>61-90 days</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ar_aging.days_61_90)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>90+ days</span>
                <span className="font-medium text-destructive">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ar_aging.days_over_90)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AP Aging Summary</CardTitle>
            <CardDescription>Accounts Payable aging buckets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ap_aging.current)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>1-30 days</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ap_aging.days_1_30)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>31-60 days</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ap_aging.days_31_60)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>61-90 days</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ap_aging.days_61_90)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>90+ days</span>
                <span className="font-medium text-destructive">
                  {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(overviewData.ap_aging.days_over_90)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
