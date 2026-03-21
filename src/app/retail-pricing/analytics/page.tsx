'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import {
  PriceTrendChart,
  type PriceTrendDataPoint,
} from '@/components/pricing/charts/PriceTrendChart';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardMetrics {
  avg_price_change_percent?: number;
  products_above_market?: number;
  products_below_market?: number;
  optimization_opportunities?: number;
  insufficient_data?: boolean;
  reason?: string;
}

export default function RetailPricingAnalyticsPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [priceTrends, setPriceTrends] = useState<PriceTrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleApiResponse = async (response: Response) => {
    if (response.status === 401 || response.status === 403) {
      setAuthError(
        response.status === 401 ? 'Authentication required' : 'Organization context required'
      );
      return null;
    }
    const data = (await response.json()) as { success?: boolean; data?: unknown };
    if (data.data && typeof data.data === 'object' && 'insufficient_data' in data.data) {
      return null;
    }
    if (data.success) return data.data;
    return null;
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/pricing/analytics?type=dashboard');
      const result = (await handleApiResponse(response)) as DashboardMetrics | null;
      if (result) setDashboardMetrics(result);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceTrends = async () => {
    setTrendsLoading(true);
    try {
      const response = await fetch('/api/v1/pricing/analytics?type=trends&days=90');
      const result = await handleApiResponse(response);
      if (result && Array.isArray(result)) setPriceTrends(result as PriceTrendDataPoint[]);
    } catch (error) {
      console.error('Failed to fetch price trends:', error);
    } finally {
      setTrendsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
    void fetchPriceTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load
  }, []);

  return (
    <AppLayout
      title="Retail pricing analytics"
      breadcrumbs={[
        { label: 'Retail Price Listing', href: '/retail-pricing/price-positioning' },
        { label: 'Analytics' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Retail pricing analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Selling price movement and catalogue signals. Competitive and scraping insights live under{' '}
              <Link href="/market-analysis" className="text-primary underline-offset-4 hover:underline">
                Market Analysis
              </Link>
              .
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-[10px]" asChild>
            <Link href="/retail-pricing/price-positioning">Edit selling prices</Link>
          </Button>
        </div>

        {authError ? (
          <Card className="border-destructive/50 bg-destructive/10 rounded-[10px]">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm font-medium">{authError}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Sign in with an active organization to load pricing analytics.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-[10px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg price change</CardTitle>
              <TrendingUp className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading
                  ? '…'
                  : dashboardMetrics?.avg_price_change_percent != null
                    ? `${dashboardMetrics.avg_price_change_percent.toFixed(1)}%`
                    : '—'}
              </div>
              <p className="text-muted-foreground text-xs">Last 30 days (where logged)</p>
            </CardContent>
          </Card>

          <Card className="rounded-[10px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Above reference</CardTitle>
              <TrendingUp className="text-success h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '…' : (dashboardMetrics?.products_above_market ?? '—')}
              </div>
              <p className="text-muted-foreground text-xs">Vs tracked benchmarks</p>
            </CardContent>
          </Card>

          <Card className="rounded-[10px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Below reference</CardTitle>
              <TrendingDown className="text-destructive h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '…' : (dashboardMetrics?.products_below_market ?? '—')}
              </div>
              <p className="text-muted-foreground text-xs">Vs tracked benchmarks</p>
            </CardContent>
          </Card>

          <Card className="rounded-[10px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logged updates</CardTitle>
              <BarChart3 className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '…' : (dashboardMetrics?.optimization_opportunities ?? '—')}
              </div>
              <p className="text-muted-foreground text-xs">Audit trail count (legacy field)</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[10px]">
          <CardHeader>
            <CardTitle>Internal price trends</CardTitle>
            <CardDescription>Selling price movement over the selected window</CardDescription>
          </CardHeader>
          <CardContent>
            <PriceTrendChart data={priceTrends} loading={trendsLoading} />
            {!trendsLoading && priceTrends.length === 0 ? (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => void fetchPriceTrends()}
                  className="text-primary text-sm underline-offset-4 hover:underline"
                >
                  Load trends
                </button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
