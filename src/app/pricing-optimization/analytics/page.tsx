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
import { PriceTrendChart, type PriceTrendDataPoint } from '@/components/pricing/charts/PriceTrendChart';
import { CompetitorComparisonChart, type CompetitorComparisonData } from '@/components/pricing/charts/CompetitorComparisonChart';
import { ElasticityChart, type ElasticityChartData } from '@/components/pricing/charts/ElasticityChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PricingAnalyticsPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<unknown>(null);
  const [priceTrends, setPriceTrends] = useState<PriceTrendDataPoint[]>([]);
  const [competitorData, setCompetitorData] = useState<CompetitorComparisonData[]>([]);
  const [elasticityData, setElasticityData] = useState<ElasticityChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [elasticityLoading, setElasticityLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/pricing/analytics?type=dashboard');
      const data = await response.json();
      if (data.success) {
        setDashboardMetrics(data.data);
      }
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
      const data = await response.json();
      if (data.success) {
        setPriceTrends(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch price trends:', error);
    } finally {
      setTrendsLoading(false);
    }
  };

  const fetchCompetitorData = async () => {
    setCompetitorsLoading(true);
    try {
      // Fetch competitor comparison data
      // This would need to be implemented in the API or use existing competitor endpoints
      // For now, using placeholder structure
      const response = await fetch('/api/v1/pricing/analytics?type=competitor');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setCompetitorData(data.data);
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
      // This would need product-specific elasticity data
      // For now, using placeholder structure
      setElasticityData(null);
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
            Deep insights into pricing performance, competitive positioning, and optimization opportunities
          </p>
        </div>

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
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : `${dashboardMetrics?.avg_price_change_percent?.toFixed(1) || '0'}%`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Above Market</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : dashboardMetrics?.products_above_market || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Products priced higher
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Below Market</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : dashboardMetrics?.products_below_market || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Products priced lower
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '...' : dashboardMetrics?.optimization_opportunities || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Potential improvements
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Price Performance Trends</CardTitle>
                <CardDescription>Historical pricing performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <PriceTrendChart 
                  data={priceTrends} 
                  loading={trendsLoading}
                />
                {!trendsLoading && priceTrends.length === 0 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={fetchPriceTrends}
                      className="text-sm text-primary hover:underline"
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
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">Product #{i}</p>
                        <p className="text-sm text-muted-foreground">SKU-{i.toString().padStart(5, '0')}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">${(99.99 + i * 10).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">{(25 + i * 5)}% margin</p>
                        </div>
                        <Badge variant="default">
                          <TrendingUp className="mr-1 h-3 w-3" />
                          +{i * 2}%
                        </Badge>
                      </div>
                    </div>
                  ))}
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
                <CompetitorComparisonChart 
                  data={competitorData} 
                  loading={competitorsLoading}
                />
                {!competitorsLoading && competitorData.length === 0 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={fetchCompetitorData}
                      className="text-sm text-primary hover:underline"
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
                  <ElasticityChart 
                    data={elasticityData} 
                    loading={elasticityLoading}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {elasticityLoading ? (
                        'Loading elasticity data...'
                      ) : (
                        <div className="text-center">
                          <p className="mb-4">No elasticity data available</p>
                          <button
                            onClick={fetchElasticityData}
                            className="text-sm text-primary hover:underline"
                          >
                            Load elasticity analysis
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {[
                        { name: 'Highly Elastic', coef: -2.5, color: 'red' },
                        { name: 'Moderately Elastic', coef: -1.2, color: 'yellow' },
                        { name: 'Unit Elastic', coef: -1.0, color: 'blue' },
                        { name: 'Inelastic', coef: -0.5, color: 'green' },
                      ].map((item, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{item.name} Products</p>
                            <Badge>{Math.abs(item.coef).toFixed(1)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.coef > -1
                              ? 'Low price sensitivity - can increase prices'
                              : 'High price sensitivity - focus on volume'}
                          </p>
                        </div>
                      ))}
                    </div>
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
      // Get org_id from context or use default
      const org_id = '00000000-0000-0000-0000-000000000000'; // TODO: Get from auth context

      const response = await fetch('/api/v1/pricing/competitors/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id,
          prices: [{
            product_id: formData.product_id,
            competitor_name: formData.competitor_name,
            competitor_sku: formData.competitor_sku || undefined,
            price: parseFloat(formData.price),
            currency: formData.currency,
            source_url: formData.source_url || undefined,
            source_type: 'manual' as const,
            in_stock: formData.in_stock,
          }],
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
            onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
            placeholder="UUID"
            required
          />
        </div>
        <div>
          <Label htmlFor="competitor_name">Competitor Name</Label>
          <Input
            id="competitor_name"
            value={formData.competitor_name}
            onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, competitor_sku: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
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
            onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
      {message && (
        <div className={`p-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Adding...' : 'Add Competitor Price'}
      </Button>
    </form>
  );
}
