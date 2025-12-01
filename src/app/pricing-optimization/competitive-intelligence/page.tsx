'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  Play,
  Settings,
  BarChart3,
  Users,
  Activity,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

export default function CompetitiveIntelligenceDashboardPage() {
  const [metrics, setMetrics] = useState<{
    totalCompetitors?: number;
    activeJobs?: number;
    totalSnapshots?: number;
    openAlerts?: number;
    productsTracked?: number;
    avgPriceChange?: number;
    priceBreaches?: number;
    marketShareEstimate?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const response = await fetch('/api/v1/pricing-intel/snapshots?summary=true');
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setMetrics(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Competitive Market Intelligence"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        { label: 'Competitive Intelligence' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Competitive Market Intelligence</h1>
            <p className="text-muted-foreground mt-1">
              Monitor competitors, track pricing, and gain strategic market insights
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/pricing-optimization/competitive-intelligence/competitors">
                <Users className="mr-2 h-4 w-4" />
                Manage Competitors
              </Link>
            </Button>
            <Button asChild>
              <Link href="/pricing-optimization/competitive-intelligence/jobs">
                <Play className="mr-2 h-4 w-4" />
                Start Scraping
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.totalCompetitors?.toLocaleString() || '0'}
              </div>
              <p className="text-muted-foreground text-xs">Active monitoring</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Scraping Jobs</CardTitle>
              <Activity className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.activeJobs?.toLocaleString() || '0'}
              </div>
              <p className="text-muted-foreground text-xs">Running now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Snapshots</CardTitle>
              <Eye className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.totalSnapshots?.toLocaleString() || '0'}
              </div>
              <p className="text-muted-foreground text-xs">Total collected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Alerts</CardTitle>
              <AlertCircle className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.openAlerts?.toLocaleString() || '0'}
              </div>
              <p className="text-muted-foreground text-xs">Requires attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products Tracked</CardTitle>
              <Target className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.productsTracked?.toLocaleString() || '0'}
              </div>
              <p className="text-muted-foreground text-xs">Matched products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Price Breaches (30d)</CardTitle>
              <AlertCircle className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.priceBreaches?.toLocaleString() || '0'}
              </div>
              <p className="text-muted-foreground text-xs">Competitor undercuts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Share Estimate</CardTitle>
              <BarChart3 className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : metrics?.marketShareEstimate?.toFixed(1) || '0'}%
              </div>
              <p className="text-muted-foreground text-xs">Based on pricing competitiveness</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg" asChild>
            <Link href="/pricing-optimization/competitive-intelligence/competitors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="text-primary h-5 w-5" />
                  <CardTitle>Competitor Management</CardTitle>
                </div>
                <CardDescription>Add, edit, and manage competitor profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Manage profiles</span>
                  <Badge variant="secondary">
                    {loading ? '...' : metrics?.totalCompetitors || '0'}
                  </Badge>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg" asChild>
            <Link href="/pricing-optimization/competitive-intelligence/jobs">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Play className="text-primary h-5 w-5" />
                  <CardTitle>Scraping Jobs</CardTitle>
                </div>
                <CardDescription>Schedule and monitor web scraping jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Active jobs</span>
                  <Badge variant="outline">{loading ? '...' : metrics?.activeJobs || '0'}</Badge>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg" asChild>
            <Link href="/pricing-optimization/competitive-intelligence/alerts">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-primary h-5 w-5" />
                  <CardTitle>Alerts & Notifications</CardTitle>
                </div>
                <CardDescription>Configure and view competitive alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Open alerts</span>
                  <Badge variant="destructive">
                    {loading ? '...' : metrics?.openAlerts || '0'}
                  </Badge>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Market Intelligence</CardTitle>
            <CardDescription>Latest competitive data snapshots and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground py-8 text-center">
                Loading recent activity...
              </div>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                No recent activity to display. Start monitoring competitors to see data here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
