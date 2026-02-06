/**
 * Pricing Analytics Page
 *
 * Comprehensive analytics dashboard with performance metrics,
 * competitor analysis, and price elasticity insights
 *
 * Author: Aster
 * Date: 2025-11-02
 */

'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import {
  PriceTrendChart,
  type PriceTrendDataPoint,
} from '@/components/pricing/charts/PriceTrendChart';
import {
  CompetitorComparisonChart,
  type CompetitorComparisonData,
} from '@/components/pricing/charts/CompetitorComparisonChart';
import {
  ElasticityChart,
  type ElasticityChartData,
} from '@/components/pricing/charts/ElasticityChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardMetrics {
  avg_price_change_percent?: number;
  products_above_market?: number;
  products_below_market?: number;
  optimization_opportunities?: number;
  insufficient_data?: boolean;
  reason?: string;
}

export default function PricingAnalyticsPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [priceTrends, setPriceTrends] = useState<PriceTrendDataPoint[]>([]);
  const [competitorData, setCompetitorData] = useState<CompetitorComparisonData[]>([]);
  const [elasticityData, setElasticityData] = useState<ElasticityChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [elasticityLoading, setElasticityLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [insufficientData, setInsufficientData] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleApiResponse = async (response: Response, key: string) => {
    if (response.status === 401 || response.status === 403) {
      setAuthError(response.status === 401 ? 'Authentication required' : 'Organization context required');
      return null;
    }
    const data = await response.json();
    if (data.data?.insufficient_data) {
      setInsufficientData(prev => ({ ...prev, [key]: data.data.reason || 'Insufficient data' }));
      return null;
    }
    if (data.success) return data.data;
    return null;
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/pricing/analytics?type=dashboard');
      const result = await handleApiResponse(response, 'dashboard');
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
      const result = await handleApiResponse(response, 'trends');
      if (result) setPriceTrends(result);
    } catch (error) {
      console.error('Failed to fetch price trends:', error);
    } finally {
      setTrendsLoading(false);
    }
  };

  const fetchCompetitorData = async () => {
    setCompetitorsLoading(true);
    try {
      const response = await fetch('/api/v1/pricing/analytics?type=competitor');
      const result = await handleApiResponse(response, 'competitors');
      if (result && Array.isArray(result)) {
        setCompetitorData(result);
      }
    } catch (error) {
      console.error('Failed to fetch competitor data:', error);
    } finally {
      setCompetitorsLoading(false);
    }
  };

  const fetchElasticityData = async () => {
    setElasticityLoading(true);
    try {
      const response = await fetch('/api/v1/pricing/analytics?type=elasticity');
      const result = await handleApiResponse(response, 'elasticity');
      if (result) setElasticityData(result);
    } catch (error) {
      console.error('Failed to fetch elasticity data:', error);
    } finally {
      setElasticityLoading(false);
    }
  };

  return (
    <AppLayout
      title="Pricing Analytics"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        { label: 'Analytics' },
      ]}
    >
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Deep insights into pricing performance, competitive positioning, and optimization
            opportunities
          </p>
        </div>

        {authError && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm font-medium">{authError}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Please sign in and ensure you have an active organization to view analytics.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="elasticity">Price Elasticity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Price Change</CardTitle>
                  <TrendingUp className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading
                      ? '...'
                      : dashboardMetrics?.avg_price_change_percent != null
                        ? `${dashboardMetrics.avg_price_change_percent.toFixed(1)}%`
                        : '—'}
                  </div>
                  <p className="text-muted-foreground text-xs">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Above Market</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : dashboardMetrics?.products_above_market ?? '—'}
                  </div>
                  <p className="text-muted-foreground text-xs">Products priced higher</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Below Market</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : dashboardMetrics?.products_below_market ?? '—'}
                  </div>
                  <p className="text-muted-foreground text-xs">Products priced lower</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
                  <Target className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : dashboardMetrics?.optimization_opportunities ?? '—'}
                  </div>
                  <p className="text-muted-foreground text-xs">Potential improvements</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Price Performance Trends</CardTitle>
                <CardDescription>Historical pricing performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <PriceTrendChart data={priceTrends} loading={trendsLoading} />
                {!trendsLoading && priceTrends.length === 0 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={fetchPriceTrends}
                      className="text-primary text-sm hover:underline"
                    >
                      Load price trends
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>Products with best price-to-performance ratio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground flex h-[200px] items-center justify-center text-center">
                  <div>
                    <Target className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    <p className="font-medium">Insufficient data</p>
                    <p className="mt-1 text-sm">
                      Performance metrics require pricing history and optimization data.
                      <br />
                      Run a pricing optimization first to populate this view.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Competitive Price Comparison</CardTitle>
                <CardDescription>Your prices vs. market average</CardDescription>
              </CardHeader>
              <CardContent>
                <CompetitorComparisonChart data={competitorData} loading={competitorsLoading} />
                {!competitorsLoading && competitorData.length === 0 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={fetchCompetitorData}
                      className="text-primary text-sm hover:underline"
                    >
                      Load competitor data
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Manual Competitor Price Entry</CardTitle>
                <CardDescription>Add competitor prices manually or import from CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <ManualCompetitorPriceForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="elasticity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Price Elasticity Analysis</CardTitle>
                <CardDescription>Demand sensitivity to price changes</CardDescription>
              </CardHeader>
              <CardContent>
                {elasticityData ? (
                  <ElasticityChart data={elasticityData} loading={elasticityLoading} />
                ) : (
                  <div className="text-muted-foreground flex h-[300px] items-center justify-center">
                    {elasticityLoading ? (
                      'Loading elasticity data...'
                    ) : insufficientData.elasticity ? (
                      <div className="text-center">
                        <Target className="mx-auto mb-3 h-8 w-8 opacity-40" />
                        <p className="font-medium">Insufficient data</p>
                        <p className="mt-1 text-sm">{insufficientData.elasticity}</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="mb-4">Load elasticity data to see demand sensitivity analysis</p>
                        <Button variant="outline" size="sm" onClick={fetchElasticityData}>
                          Load elasticity analysis
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function ManualCompetitorPriceForm() {
  const [formData, setFormData] = useState({
    product_id: '',
    competitor_name: '',
    competitor_sku: '',
    price: '',
    currency: 'ZAR',
    source_url: '',
    in_stock: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/v1/pricing/competitors/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prices: [
            {
              product_id: formData.product_id,
              competitor_name: formData.competitor_name,
              competitor_sku: formData.competitor_sku || undefined,
              price: parseFloat(formData.price),
              currency: formData.currency,
              source_url: formData.source_url || undefined,
              source_type: 'manual' as const,
              in_stock: formData.in_stock,
            },
          ],
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Competitor price added successfully' });
        setFormData({
          product_id: '',
          competitor_name: '',
          competitor_sku: '',
          price: '',
          currency: 'ZAR',
          source_url: '',
          in_stock: true,
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add competitor price' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add competitor price' });
      console.error('Error adding competitor price:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="product_id">Product ID</Label>
          <Input
            id="product_id"
            value={formData.product_id}
            onChange={e => setFormData({ ...formData, product_id: e.target.value })}
            placeholder="UUID"
            required
          />
        </div>
        <div>
          <Label htmlFor="competitor_name">Competitor Name</Label>
          <Input
            id="competitor_name"
            value={formData.competitor_name}
            onChange={e => setFormData({ ...formData, competitor_name: e.target.value })}
            placeholder="Competitor name"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="competitor_sku">Competitor SKU (optional)</Label>
          <Input
            id="competitor_sku"
            value={formData.competitor_sku}
            onChange={e => setFormData({ ...formData, competitor_sku: e.target.value })}
            placeholder="SKU"
          />
        </div>
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={formData.currency}
            onValueChange={value => setFormData({ ...formData, currency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ZAR">ZAR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="source_url">Source URL (optional)</Label>
          <Input
            id="source_url"
            type="url"
            value={formData.source_url}
            onChange={e => setFormData({ ...formData, source_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
      {message && (
        <div
          className={`rounded-md p-3 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
        >
          {message.text}
        </div>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Adding...' : 'Add Competitor Price'}
      </Button>
    </form>
  );
}
