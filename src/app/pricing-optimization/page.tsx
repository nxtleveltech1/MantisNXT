/**
 * Pricing Optimization Overview Dashboard
 *
 * Main entry point for pricing management with KPIs, quick actions,
 * and navigation to detailed sections
 *
 * Author: Aster (Principal Full-Stack & Architecture Expert)
 * Date: 2025-11-02
 */

'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertCircle,
  Play,
  Settings,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

export default function PricingDashboardPage() {
  const [metrics, setMetrics] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const response = await fetch('/api/v1/pricing/analytics?type=dashboard');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Pricing Optimization"
      breadcrumbs={[{ label: 'Pricing Optimization' }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pricing Optimization</h1>
            <p className="text-muted-foreground mt-1">
              Intelligent pricing strategies and revenue optimization
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/pricing-optimization/rules">
                <Settings className="mr-2 h-4 w-4" />
                Manage Rules
              </Link>
            </Button>
            <Button asChild>
              <Link href="/pricing-optimization/optimization">
                <Play className="mr-2 h-4 w-4" />
                Start Optimization
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products Tracked</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.total_products_tracked?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Active pricing monitoring
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Price Changes (30d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.recent_price_changes?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg change: {loading ? '...' : `${metrics?.avg_price_change_percent?.toFixed(1) || '0'}%`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.active_competitors_tracked?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Active monitoring
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Optimization Opportunities</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.optimization_opportunities?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Pending recommendations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" asChild>
            <Link href="/pricing-optimization/rules">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <CardTitle>Pricing Rules</CardTitle>
                </div>
                <CardDescription>
                  Create and manage automated pricing rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active rules</span>
                  <Badge variant="secondary">
                    {loading ? '...' : metrics?.active_rules_count || '0'}
                  </Badge>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" asChild>
            <Link href="/pricing-optimization/optimization">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  <CardTitle>Run Optimization</CardTitle>
                </div>
                <CardDescription>
                  Start AI-powered pricing optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ready to optimize</span>
                  <Badge variant="outline">Start</Badge>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" asChild>
            <Link href="/pricing-optimization/analytics">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle>Analytics & Insights</CardTitle>
                </div>
                <CardDescription>
                  View performance and competitive analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">View trends</span>
                  <Badge variant="outline">Analyze</Badge>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Price Changes</CardTitle>
            <CardDescription>Latest pricing adjustments across your catalog</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading price changes...</div>
            ) : metrics?.recent_changes_list && metrics.recent_changes_list.length > 0 ? (
              <div className="space-y-4">
                {metrics.recent_changes_list.map((change: unknown, index: number) => {
                  const priceChangePercent = change.price_change_percent || 0;
                  const isDecrease = priceChangePercent < 0;
                  const daysAgo = Math.floor(
                    (new Date().getTime() - new Date(change.changed_at).getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{change.product_name || 'Unknown Product'}</p>
                        <p className="text-sm text-muted-foreground">{change.sku || 'No SKU'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground line-through">
                            ${change.old_price?.toFixed(2) || '0.00'}
                          </p>
                          <p className="font-medium">${change.new_price?.toFixed(2) || '0.00'}</p>
                        </div>
                        <Badge variant={isDecrease ? 'default' : 'secondary'}>
                          {isDecrease ? (
                            <>
                              <TrendingDown className="mr-1 h-3 w-3" />
                              {priceChangePercent.toFixed(1)}%
                            </>
                          ) : (
                            <>
                              <TrendingUp className="mr-1 h-3 w-3" />
                              +{priceChangePercent.toFixed(1)}%
                            </>
                          )}
                        </Badge>
                        <span className="text-sm text-muted-foreground w-24">
                          {daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent price changes in the last 30 days
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
