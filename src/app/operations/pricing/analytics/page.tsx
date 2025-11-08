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
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';

export default function PricingAnalyticsPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <AppLayout
      title="Pricing Analytics"
      breadcrumbs={[
        { label: 'Operations', href: '/operations' },
        { label: 'Pricing & Optimization', href: '/operations/pricing' },
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
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Price trend chart will be displayed here
                </div>
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
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">Product Category {i}</p>
                        <Badge variant={i % 2 === 0 ? 'default' : 'secondary'}>
                          {i % 2 === 0 ? 'Above Market' : 'Below Market'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Your Price</p>
                          <p className="text-lg font-bold">${(100 + i * 20).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Market Avg</p>
                          <p className="text-lg font-bold">${(95 + i * 20).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Difference</p>
                          <p className="text-lg font-bold text-green-600">+{(i * 2).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
