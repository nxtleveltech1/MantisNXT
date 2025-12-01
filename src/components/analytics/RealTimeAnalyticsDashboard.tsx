'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Line,
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Clock,
  Target,
  Brain,
  BarChart3,
  Package,
  FileText,
  Activity,
  RefreshCw,
  Star,
  Building2,
  Lightbulb,
  Info,
  Archive,
  AlertOctagon,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

// Enhanced Types for Real-Time Analytics
interface AnalyticsMetrics {
  spend: {
    total: number;
    monthlyBudget: number;
    yearToDate: number;
    forecast: number;
    variance: number;
    trend: number;
  };
  suppliers: {
    total: number;
    active: number;
    topPerforming: number;
    riskLevel: 'low' | 'medium' | 'high';
    averageRating: number;
    complianceRate: number;
  };
  inventory: {
    totalValue: number;
    itemCount: number;
    lowStock: number;
    stockTurnover: number;
    avgDaysInStock: number;
    optimizationSavings: number;
  };
  procurement: {
    totalOrders: number;
    pendingApprovals: number;
    avgProcessingTime: number;
    complianceScore: number;
    costSavings: number;
    automationRate: number;
  };
}

interface AnalyticsInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  confidence: number;
  value: number;
  category: string;
  createdAt: string;
}

interface RealTimeAnalyticsDashboardProps {
  refreshInterval?: number;
  enableRealTime?: boolean;
  compactMode?: boolean;
  customDateRange?: { start: Date; end: Date };
}

const RealTimeAnalyticsDashboard: React.FC<RealTimeAnalyticsDashboardProps> = ({
  refreshInterval = 30000,
  enableRealTime = true,
  compactMode = false,
  customDateRange,
}) => {
  // State Management
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [chartData, setChartData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(enableRealTime);

  // Fetch analytics data from backend
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setError(null);

      // Fetch dashboard metrics
      const [dashboardResponse, anomaliesResponse, predictionsResponse, recommendationsResponse] =
        await Promise.all([
          fetch(
            `/api/analytics/dashboard?timeRange=${selectedTimeRange}&category=${selectedCategory}`
          ),
          fetch(`/api/analytics/anomalies?limit=10`),
          fetch(`/api/analytics/predictions?horizon=30`),
          fetch(`/api/analytics/recommendations?limit=5`),
        ]);

      const dashboardData = await dashboardResponse.json();
      const anomaliesData = await anomaliesResponse.json();
      const predictionsData = await predictionsResponse.json();
      const recommendationsData = await recommendationsResponse.json();

      if (dashboardData.success) {
        setMetrics(dashboardData.data.metrics);
        setChartData(dashboardData.data.chartData || []);
      }

      // Combine insights from different sources
      const allInsights: AnalyticsInsight[] = [
        ...(anomaliesData.success && anomaliesData.data.anomalies
          ? anomaliesData.data.anomalies.map((anomaly: unknown) => ({
              id: `anomaly-${anomaly.type}-${Date.now()}`,
              type: 'anomaly' as const,
              priority: anomaly.severity === 'high' ? ('high' as const) : ('medium' as const),
              title: anomaly.title || `${anomaly.type} Anomaly Detected`,
              description: anomaly.description,
              impact: `Value: ${anomaly.value}, Threshold: ${anomaly.threshold}`,
              recommendation: `Review ${anomaly.type} anomaly`,
              confidence: 0.85,
              value: anomaly.value,
              category: anomaly.type,
              createdAt: anomaly.detected_at || new Date().toISOString(),
            }))
          : []),
        ...(predictionsData.success && predictionsData.data.predictions
          ? predictionsData.data.predictions.map((prediction: unknown) => ({
              id: `prediction-${prediction.type}-${Date.now()}`,
              type: 'trend' as const,
              priority: prediction.action_required ? ('high' as const) : ('medium' as const),
              title: prediction.title,
              description: prediction.description,
              impact: `Timeline: ${prediction.timeline}`,
              recommendation: prediction.action_required ? 'Action required' : 'Monitor situation',
              confidence: prediction.confidence / 100,
              value: 0,
              category: prediction.type,
              createdAt: new Date().toISOString(),
            }))
          : []),
        ...(recommendationsData.success && recommendationsData.data.recommendations
          ? recommendationsData.data.recommendations.map((rec: unknown) => ({
              id: rec.id || `recommendation-${Date.now()}`,
              type: 'opportunity' as const,
              priority: rec.priority,
              title: rec.title,
              description: rec.description,
              impact: `Impact: ${rec.impact}, Effort: ${rec.effort}`,
              recommendation: rec.action,
              confidence: 0.75,
              value: 0,
              category: rec.category,
              createdAt: rec.created_at || new Date().toISOString(),
            }))
          : []),
      ];

      setInsights(
        allInsights.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, selectedCategory]);

  // Real-time refresh effect
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchAnalyticsData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAnalyticsData]);

  // Computed values
  const priorityInsights = useMemo(() => {
    return insights.filter(insight => insight.priority === 'high').slice(0, 5);
  }, [insights]);

  const getInsightIcon = (type: string, priority: string) => {
    switch (type) {
      case 'anomaly':
        return priority === 'high' ? AlertOctagon : AlertTriangle;
      case 'opportunity':
        return Lightbulb;
      case 'trend':
        return TrendingUp;
      case 'risk':
        return ShieldCheck;
      default:
        return Info;
    }
  };

  const getInsightColor = (type: string, priority: string) => {
    if (priority === 'high') return 'from-red-500 to-red-600';
    switch (type) {
      case 'opportunity':
        return 'from-green-500 to-green-600';
      case 'trend':
        return 'from-blue-500 to-blue-600';
      case 'anomaly':
        return 'from-yellow-500 to-yellow-600';
      case 'risk':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="space-y-4 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mx-auto w-fit rounded-full bg-blue-100 p-4"
          >
            <Brain className="h-8 w-8 text-blue-600" />
          </motion.div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Loading Analytics</h3>
            <p className="text-gray-600">Processing real-time data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertOctagon className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="mb-1 font-semibold">Analytics Error</div>
          <div>{error}</div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              setError(null);
              fetchAnalyticsData();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="rounded-xl bg-white/20 p-3 backdrop-blur-sm"
              >
                <Brain className="h-8 w-8" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold">AI-Powered Analytics</h1>
                <p className="text-lg text-blue-100">Real-time insights and predictions</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-blue-200">Last Updated</div>
              <div className="font-semibold">
                {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`${autoRefresh ? 'bg-green-500 text-white' : 'bg-white/20 text-white'}`}
              >
                <Activity className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
                {autoRefresh ? 'Live' : 'Paused'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchAnalyticsData}
                disabled={loading}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Cards */}
      {metrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {/* Spend Metrics */}
          <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-100 shadow-xl transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-green-500 p-3 text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {metrics.spend.trend > 0 ? '+' : ''}
                  {metrics.spend.trend.toFixed(1)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-green-800">
                  ${(metrics.spend.total / 1000000).toFixed(1)}M
                </div>
                <div className="text-sm text-green-700">Total Spend</div>
                <div className="flex items-center text-xs text-green-600">
                  <Target className="mr-1 h-3 w-3" />
                  Budget: ${(metrics.spend.monthlyBudget / 1000000).toFixed(1)}M
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suppliers Metrics */}
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-xl transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-500 p-3 text-white">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current text-yellow-500" />
                  <span className="text-sm font-medium">
                    {metrics.suppliers.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-blue-800">{metrics.suppliers.active}</div>
                <div className="text-sm text-blue-700">Active Suppliers</div>
                <div className="flex items-center text-xs text-blue-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {metrics.suppliers.complianceRate.toFixed(0)}% Compliance
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Metrics */}
          <Card className="border-0 bg-gradient-to-br from-purple-50 to-violet-100 shadow-xl transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-purple-500 p-3 text-white">
                  <Package className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {metrics.inventory.lowStock} Low Stock
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-purple-800">
                  ${(metrics.inventory.totalValue / 1000000).toFixed(1)}M
                </div>
                <div className="text-sm text-purple-700">Inventory Value</div>
                <div className="flex items-center text-xs text-purple-600">
                  <Archive className="mr-1 h-3 w-3" />
                  {metrics.inventory.itemCount.toLocaleString()} Items
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Procurement Metrics */}
          <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-100 shadow-xl transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-orange-500 p-3 text-white">
                  <FileText className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {metrics.procurement.automationRate.toFixed(0)}% Auto
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-orange-800">
                  {metrics.procurement.totalOrders}
                </div>
                <div className="text-sm text-orange-700">Total Orders</div>
                <div className="flex items-center text-xs text-orange-600">
                  <Clock className="mr-1 h-3 w-3" />
                  {metrics.procurement.avgProcessingTime}d Avg Processing
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Priority Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 p-2 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              Priority Insights
              <Badge variant="secondary" className="ml-auto">
                {priorityInsights.length} High Priority
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="space-y-4 p-6">
                <AnimatePresence>
                  {priorityInsights.map((insight, index) => {
                    const Icon = getInsightIcon(insight.type, insight.priority);
                    return (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative rounded-xl border-2 border-gray-200 bg-gradient-to-r from-white to-gray-50 p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-lg"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`rounded-xl bg-gradient-to-r p-3 ${getInsightColor(insight.type, insight.priority)} text-white shadow-lg`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                              <Badge
                                variant={insight.priority === 'high' ? 'destructive' : 'secondary'}
                              >
                                {insight.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {(insight.confidence * 100).toFixed(0)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700">{insight.description}</p>
                            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                              <div className="rounded-lg bg-blue-50 p-2">
                                <span className="font-medium text-blue-800">Impact:</span>
                                <span className="ml-1 text-blue-700">{insight.impact}</span>
                              </div>
                              <div className="rounded-lg bg-green-50 p-2">
                                <span className="font-medium text-green-800">Action:</span>
                                <span className="ml-1 text-green-700">
                                  {insight.recommendation}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {new Date(insight.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Section */}
      {chartData && chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Spend Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="actual" fill="#3B82F6" name="Actual Spend" />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#10B981"
                    strokeWidth={3}
                    name="Forecast"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="performance"
                    stackId="1"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.6}
                    name="Performance Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default RealTimeAnalyticsDashboard;
