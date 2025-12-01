'use client';

/**
 * AI-Powered Loyalty Analytics Component
 *
 * Connects to production AI analytics endpoints:
 * - /api/v1/admin/loyalty/analytics/metrics - Core metrics
 * - /api/v1/admin/loyalty/analytics/churn - Churn prediction
 * - /api/v1/admin/loyalty/analytics/engagement - Engagement scoring
 * - /api/v1/admin/loyalty/analytics/rewards - Reward optimization
 * - /api/v1/admin/loyalty/analytics/tier-prediction - Tier movements
 * - /api/v1/admin/loyalty/analytics/roi - ROI analysis
 * - /api/v1/admin/loyalty/analytics/fraud - Fraud detection
 *
 * @author Claude Code
 * @date 2025-11-04
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  Gift,
  Download,
  DollarSign,
  Percent,
  ArrowUpRight,
  AlertTriangle,
  Brain,
  Target,
  Shield,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const TIER_COLORS: Record<string, string> = {
  bronze: '#d97706',
  silver: '#9ca3af',
  gold: '#eab308',
  platinum: '#60a5fa',
  diamond: '#a855f7',
};

const RISK_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export default function AILoyaltyAnalytics() {
  const [programId, setProgramId] = useState<string>('');
  const [period, setPeriod] = useState<number>(30);

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['loyalty-programs'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/loyalty/programs');
      if (!res.ok) throw new Error('Failed to fetch programs');
      return res.json();
    },
  });

  // Set default program
  React.useEffect(() => {
    if (programs && programs.length > 0 && !programId) {
      const defaultProgram = programs.find((p: unknown) => p.is_default) || programs[0];
      setProgramId(defaultProgram.id);
    }
  }, [programs, programId]);

  // Fetch core metrics
  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['ai-loyalty-metrics', programId, period],
    queryFn: async () => {
      if (!programId) return null;
      const res = await fetch(
        `/api/v1/admin/loyalty/analytics/metrics?program_id=${programId}&period=${period}`
      );
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const result = await res.json();
      return result.data;
    },
    enabled: !!programId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch churn predictions
  const {
    data: churnData,
    isLoading: churnLoading,
    error: churnError,
  } = useQuery({
    queryKey: ['ai-loyalty-churn', programId],
    queryFn: async () => {
      if (!programId) return null;
      const res = await fetch(`/api/v1/admin/loyalty/analytics/churn?program_id=${programId}`);
      if (!res.ok) throw new Error('Failed to fetch churn predictions');
      const result = await res.json();
      return result.data;
    },
    enabled: !!programId,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch engagement scores
  const {
    data: engagementData,
    isLoading: engagementLoading,
    error: engagementError,
  } = useQuery({
    queryKey: ['ai-loyalty-engagement', programId],
    queryFn: async () => {
      if (!programId) return null;
      const res = await fetch(`/api/v1/admin/loyalty/analytics/engagement?program_id=${programId}`);
      if (!res.ok) throw new Error('Failed to fetch engagement scores');
      const result = await res.json();
      return result.data;
    },
    enabled: !!programId,
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch reward optimization
  const {
    data: rewardsData,
    isLoading: rewardsLoading,
    error: rewardsError,
  } = useQuery({
    queryKey: ['ai-loyalty-rewards', programId],
    queryFn: async () => {
      if (!programId) return null;
      const res = await fetch(`/api/v1/admin/loyalty/analytics/rewards?program_id=${programId}`);
      if (!res.ok) throw new Error('Failed to fetch reward optimization');
      const result = await res.json();
      return result.data;
    },
    enabled: !!programId,
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch tier predictions
  const {
    data: tierData,
    isLoading: tierLoading,
    error: tierError,
  } = useQuery({
    queryKey: ['ai-loyalty-tier', programId],
    queryFn: async () => {
      if (!programId) return null;
      const res = await fetch(
        `/api/v1/admin/loyalty/analytics/tier-prediction?program_id=${programId}`
      );
      if (!res.ok) throw new Error('Failed to fetch tier predictions');
      const result = await res.json();
      return result.data;
    },
    enabled: !!programId,
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch ROI analysis
  const {
    data: roiData,
    isLoading: roiLoading,
    error: roiError,
  } = useQuery({
    queryKey: ['ai-loyalty-roi', programId],
    queryFn: async () => {
      if (!programId) return null;
      const res = await fetch(`/api/v1/admin/loyalty/analytics/roi?program_id=${programId}`);
      if (!res.ok) throw new Error('Failed to fetch ROI analysis');
      const result = await res.json();
      return result.data;
    },
    enabled: !!programId,
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch fraud detection
  const {
    data: fraudData,
    isLoading: fraudLoading,
    error: fraudError,
  } = useQuery({
    queryKey: ['ai-loyalty-fraud', programId],
    queryFn: async () => {
      if (!programId) return null;
      const res = await fetch(`/api/v1/admin/loyalty/analytics/fraud?program_id=${programId}`);
      if (!res.ok) throw new Error('Failed to fetch fraud detection');
      const result = await res.json();
      return result.data;
    },
    enabled: !!programId,
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetchMetrics();
    toast.success('Refreshing analytics data...');
  };

  const handleExport = () => {
    const report = {
      program_id: programId,
      generated_at: new Date().toISOString(),
      metrics: metricsData,
      churn: churnData,
      engagement: engagementData,
      rewards: rewardsData,
      tier_predictions: tierData,
      roi: roiData,
      fraud: fraudData,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-loyalty-analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Analytics report exported successfully');
  };

  const isLoading =
    metricsLoading ||
    churnLoading ||
    engagementLoading ||
    rewardsLoading ||
    tierLoading ||
    roiLoading ||
    fraudLoading;
  const hasError =
    metricsError ||
    churnError ||
    engagementError ||
    rewardsError ||
    tierError ||
    roiError ||
    fraudError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">AI-Powered Analytics</h2>
            <Badge variant="outline" className="gap-1">
              <Brain className="h-3 w-3" />
              AI Enhanced
            </Badge>
          </div>
          <p className="text-muted-foreground">Advanced insights powered by Claude AI</p>
        </div>
        <div className="flex gap-2">
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {programs?.map((program: unknown) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {hasError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some analytics data could not be loaded. The service may be initializing or experiencing
            issues. Data will refresh automatically when available.
          </AlertDescription>
        </Alert>
      )}

      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={period === 7 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(7)}
            >
              Last 7 Days
            </Button>
            <Button
              variant={period === 30 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(30)}
            >
              Last 30 Days
            </Button>
            <Button
              variant={period === 90 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(90)}
            >
              Last 90 Days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {metricsData && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm font-medium">Total Members</p>
                  <Users className="text-muted-foreground h-4 w-4" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {metricsData.overview?.total_members?.toLocaleString() || 0}
                  </p>
                  <div className="flex items-center text-xs text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>{metricsData.overview?.growth_rate?.toFixed(1) || 0}%</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  {metricsData.overview?.active_members?.toLocaleString() || 0} active
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm font-medium">Points Issued</p>
                  <Gift className="text-muted-foreground h-4 w-4" />
                </div>
                <p className="text-2xl font-bold">
                  {metricsData.points?.total_points_issued?.toLocaleString() || 0}
                </p>
                <p className="text-muted-foreground text-xs">
                  {metricsData.points?.points_balance?.toLocaleString() || 0} balance
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm font-medium">Redemption Rate</p>
                  <Percent className="text-muted-foreground h-4 w-4" />
                </div>
                <p className="text-2xl font-bold">
                  {metricsData.engagement?.redemption_rate?.toFixed(1) || 0}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {metricsData.redemptions?.total_redemptions?.toLocaleString() || 0} redemptions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm font-medium">Avg Lifetime Value</p>
                  <DollarSign className="text-muted-foreground h-4 w-4" />
                </div>
                <p className="text-2xl font-bold">
                  ${metricsData.value?.avg_lifetime_value_per_member?.toLocaleString() || 0}
                </p>
                <p className="text-muted-foreground text-xs">
                  ${metricsData.value?.total_lifetime_value?.toLocaleString() || 0} total
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="churn">Churn Prediction</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="tiers">Tier Movements</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {metricsData?.trends && (
            <Card>
              <CardHeader>
                <CardTitle>Membership Growth</CardTitle>
                <CardDescription>New members over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsData.trends.members_by_month}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="New Members"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Churn Prediction Tab */}
        <TabsContent value="churn" className="space-y-4">
          {churnData ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Overall Churn Risk
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {(churnData.overall_churn_risk * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>At-Risk Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{churnData.at_risk_customers?.length || 0}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Critical Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">
                      {churnData.at_risk_customers?.filter(
                        (c: unknown) => c.risk_level === 'critical'
                      ).length || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Retention Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {churnData.retention_recommendations?.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <Zap className="mt-0.5 h-4 w-4 text-orange-500" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Churn prediction data is being generated. Please check back in a few moments.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          {engagementData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Overall Engagement Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {engagementData.overall_engagement_score}/100
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-muted-foreground text-sm">Highly Engaged</p>
                      <p className="text-2xl font-bold text-green-600">
                        {engagementData.engagement_distribution?.highly_engaged?.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Moderate</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {engagementData.engagement_distribution?.moderately_engaged?.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Low</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {engagementData.engagement_distribution?.low_engagement?.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Dormant</p>
                      <p className="text-2xl font-bold text-red-600">
                        {engagementData.engagement_distribution?.dormant?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Engagement data is being calculated. Please check back in a few moments.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          {rewardsData ? (
            <Card>
              <CardHeader>
                <CardTitle>Catalog Effectiveness</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-4xl font-bold">
                  {rewardsData.catalog_effectiveness_score}/100
                </p>
                <div className="space-y-4">
                  <h4 className="font-semibold">Optimization Suggestions</h4>
                  {rewardsData.optimization_suggestions?.map((suggestion: unknown, i: number) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-4">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge>{suggestion.category}</Badge>
                        <Badge
                          variant={suggestion.priority === 'critical' ? 'destructive' : 'outline'}
                        >
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <p className="text-sm">{suggestion.suggestion}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Expected Impact: {suggestion.expected_impact}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                Reward optimization data is being generated. Please check back in a few moments.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Tier Movements Tab */}
        <TabsContent value="tiers" className="space-y-4">
          {tierData ? (
            <Card>
              <CardHeader>
                <CardTitle>Tier System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-4xl font-bold">{tierData.tier_health_score}/100</p>
                <div className="space-y-2">
                  <h4 className="font-semibold">Predicted Movements (30 days)</h4>
                  <p className="text-muted-foreground text-sm">
                    {tierData.predicted_movements?.filter(
                      (m: unknown) => m.movement_type === 'upgrade'
                    ).length || 0}{' '}
                    upgrades,{' '}
                    {tierData.predicted_movements?.filter(
                      (m: unknown) => m.movement_type === 'downgrade'
                    ).length || 0}{' '}
                    downgrades
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                Tier prediction data is being generated. Please check back in a few moments.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* ROI Analysis Tab */}
        <TabsContent value="roi" className="space-y-4">
          {roiData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Program ROI</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{roiData.program_roi?.toFixed(1)}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    <div className="border-b pb-2">
                      <dt className="text-muted-foreground text-sm">Total Revenue</dt>
                      <dd className="text-xl font-bold">
                        ${roiData.roi_breakdown?.total_revenue_generated?.toLocaleString() || 0}
                      </dd>
                    </div>
                    <div className="border-b pb-2">
                      <dt className="text-muted-foreground text-sm">Program Costs</dt>
                      <dd className="text-xl font-bold">
                        ${roiData.roi_breakdown?.total_program_costs?.toLocaleString() || 0}
                      </dd>
                    </div>
                    <div className="border-b pb-2">
                      <dt className="text-muted-foreground text-sm">Net Profit Impact</dt>
                      <dd className="text-xl font-bold text-green-600">
                        ${roiData.roi_breakdown?.net_profit_impact?.toLocaleString() || 0}
                      </dd>
                    </div>
                    <div className="border-b pb-2">
                      <dt className="text-muted-foreground text-sm">AOV Increase</dt>
                      <dd className="text-xl font-bold">
                        $
                        {roiData.roi_breakdown?.average_order_value_increase?.toLocaleString() || 0}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                ROI analysis is being calculated. Please check back in a few moments.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Fraud Detection Tab */}
        <TabsContent value="fraud" className="space-y-4">
          {fraudData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Fraud Detection Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  AI-powered anomaly detection analysis complete
                </p>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                Fraud detection analysis is being performed. Please check back in a few moments.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
