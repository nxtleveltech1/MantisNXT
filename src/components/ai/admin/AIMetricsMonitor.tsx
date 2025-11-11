'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Download,
  RefreshCw,
  Brain,
  Zap,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface MetricsSummary {
  totalPredictions: number;
  averageAccuracy: number;
  activeAlerts: number;
  resolvedAlerts: number;
}

interface ServiceMetrics {
  predictions: number;
  accuracy: number;
  alerts: number;
  lastPrediction: string | null;
}

interface TrendData {
  date: string;
  predictions: number;
  accuracy: number;
}

interface MetricsData {
  summary: MetricsSummary;
  byService: {
    demand_forecasting?: ServiceMetrics;
    anomaly_detection?: ServiceMetrics;
    supplier_scoring?: ServiceMetrics;
    assistant?: ServiceMetrics;
    [key: string]: ServiceMetrics | undefined;
  };
  trends: {
    predictions: TrendData[];
    accuracy: TrendData[];
  };
  calculatedAt: string;
  cacheExpires: string;
}

const SERVICE_NAMES = {
  demand_forecasting: 'Demand Forecasting',
  anomaly_detection: 'Anomaly Detection',
  supplier_scoring: 'Supplier Scoring',
  assistant: 'AI Assistant',
};

const COLORS = {
  primary: 'hsl(var(--primary))',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

const TIME_RANGES = {
  '1h': { label: 'Last Hour', minutes: 60 },
  '6h': { label: 'Last 6 Hours', minutes: 360 },
  '24h': { label: 'Last 24 Hours', minutes: 1440 },
  '7d': { label: 'Last 7 Days', minutes: 10080 },
  '30d': { label: 'Last 30 Days', minutes: 43200 },
};

export default function AIMetricsMonitor() {
  const [selectedService, setSelectedService] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch metrics data
  const { data: metrics, isLoading, refetch } = useQuery<MetricsData>({
    queryKey: ['ai-metrics', selectedService, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedService !== 'all') params.append('service', selectedService);
      params.append('timeRange', timeRange);

      const response = await fetch(`/api/v1/ai/metrics?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch metrics');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Metrics refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh metrics');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    if (!metrics) {
      toast.error('No metrics data to export');
      return;
    }

    try {
      const csvRows: string[] = [];

      // Header
      csvRows.push('Service,Predictions,Accuracy,Active Alerts,Last Prediction');

      // Service data
      Object.entries(metrics.byService || {}).forEach(([service, data]) => {
        if (!data) return;
        const serviceName = SERVICE_NAMES[service as keyof typeof SERVICE_NAMES] || service;
        let lastPredStr = 'N/A';
        try {
          if (data.lastPrediction) {
            lastPredStr = format(new Date(data.lastPrediction), 'yyyy-MM-dd HH:mm:ss');
          }
        } catch {
          lastPredStr = 'Invalid Date';
        }
        csvRows.push(
          `${serviceName},${data.predictions},${formatPercentage(data.accuracy)},${data.alerts},${lastPredStr}`
        );
      });

      // Summary
      csvRows.push('');
      csvRows.push('Summary');
      csvRows.push(
        `Total Predictions,${metrics.summary?.totalPredictions ?? 0},Average Accuracy,${formatPercentage(
          metrics.summary?.averageAccuracy ?? 0
        )}`
      );
      csvRows.push(
        `Active Alerts,${metrics.summary?.activeAlerts ?? 0},Resolved Alerts,${metrics.summary?.resolvedAlerts ?? 0}`
      );

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ai-metrics-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Metrics exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export metrics');
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No metrics data available</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  // Prepare pie chart data for service distribution
  const pieData = metrics?.byService
    ? Object.entries(metrics.byService)
        .filter(([_, data]) => data !== undefined && data !== null)
        .map(([service, data]) => ({
          name: SERVICE_NAMES[service as keyof typeof SERVICE_NAMES] || service,
          value: data?.predictions ?? 0,
        }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Metrics Monitor</h2>
          <p className="text-muted-foreground">
            Real-time performance metrics and insights for AI services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(metrics.summary?.totalPredictions ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">↑ 12%</span> from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(metrics.summary?.averageAccuracy ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(metrics.summary?.averageAccuracy ?? 0) >= 0.95 ? (
                <span className="text-green-600">Excellent</span>
              ) : (metrics.summary?.averageAccuracy ?? 0) >= 0.85 ? (
                <span className="text-blue-600">Good</span>
              ) : (
                <span className="text-yellow-600">Needs Attention</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.summary?.activeAlerts ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Alerts</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.summary?.resolvedAlerts ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">In current period</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Service</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="demand_forecasting">Demand Forecasting</SelectItem>
                  <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                  <SelectItem value="supplier_scoring">Supplier Scoring</SelectItem>
                  <SelectItem value="assistant">AI Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_RANGES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prediction Volume</CardTitle>
              <CardDescription>Number of predictions over time</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.trends?.predictions && metrics.trends.predictions.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.trends.predictions}>
                    <defs>
                      <linearGradient id="colorPredictions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        try {
                          return value ? format(new Date(value), 'MMM d, HH:mm') : 'N/A';
                        } catch {
                          return 'Invalid';
                        }
                      }}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => {
                        try {
                          return value ? format(new Date(value), 'PPpp') : 'N/A';
                        } catch {
                          return 'Invalid Date';
                        }
                      }}
                      formatter={(value: number) => [formatNumber(value), 'Predictions']}
                    />
                    <Area
                      type="monotone"
                      dataKey="predictions"
                      stroke={COLORS.primary}
                      fillOpacity={1}
                      fill="url(#colorPredictions)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">No prediction data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accuracy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy Trends</CardTitle>
              <CardDescription>Model accuracy over time</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.trends?.accuracy && metrics.trends.accuracy.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.trends.accuracy}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        try {
                          return value ? format(new Date(value), 'MMM d, HH:mm') : 'N/A';
                        } catch {
                          return 'Invalid';
                        }
                      }}
                    />
                    <YAxis
                      domain={[0, 1]}
                      tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    />
                    <Tooltip
                      labelFormatter={(value) => {
                        try {
                          return value ? format(new Date(value), 'PPpp') : 'N/A';
                        } catch {
                          return 'Invalid Date';
                        }
                      }}
                      formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'Accuracy']}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">No accuracy data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {Object.entries(metrics.byService || {}).map(([service, data]) => {
              if (!data) return null;
              const serviceName = SERVICE_NAMES[service as keyof typeof SERVICE_NAMES] || service;

              return (
                <Card key={service}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{serviceName}</CardTitle>
                      <Badge variant={data.accuracy >= 0.8 ? 'default' : 'destructive'}>
                        {formatPercentage(data.accuracy)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Predictions</p>
                          <p className="text-2xl font-bold">{formatNumber(data.predictions)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Accuracy</p>
                          <p className="text-2xl font-bold">{formatPercentage(data.accuracy)}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Last prediction
                            </span>
                          </div>
                          <span className="text-sm">
                            {(() => {
                              try {
                                return data.lastPrediction
                                  ? format(new Date(data.lastPrediction), 'MMM d, HH:mm')
                                  : 'Never';
                              } catch {
                                return 'Invalid Date';
                              }
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm text-muted-foreground">Active alerts</span>
                          </div>
                          <span className="text-sm font-medium">{data.alerts}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Distribution</CardTitle>
              <CardDescription>Prediction volume by service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatNumber(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <p className="text-muted-foreground">No distribution data available</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <div className="space-y-4">
                    {pieData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(item.value)} predictions
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cache Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>
                Last updated: {metrics.calculatedAt ? format(new Date(metrics.calculatedAt), 'PPpp') : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                Cache expires: {metrics.cacheExpires ? format(new Date(metrics.cacheExpires), 'PPpp') : 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}