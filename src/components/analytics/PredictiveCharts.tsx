'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  Bar,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
  Maximize2,
  Minimize2,
  Database,
  Sparkles,
} from 'lucide-react';

// Types for Predictive Analytics
interface PredictiveDataPoint {
  period: string;
  actual?: number;
  predicted: number;
  confidence: {
    lower: number;
    upper: number;
  };
  anomaly?: boolean;
  factors?: {
    seasonality: number;
    trend: number;
    external: number;
  };
}

interface AnomalyDetection {
  id: string;
  period: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  confidence: number;
}

interface PredictiveChart {
  id: string;
  title: string;
  description: string;
  type: 'line' | 'area' | 'bar' | 'composed' | 'scatter';
  category: string;
  data: PredictiveDataPoint[];
  anomalies: AnomalyDetection[];
  metrics: {
    accuracy: number;
    trendDirection: 'up' | 'down' | 'stable';
    volatility: number;
    nextPeriodPrediction: number;
    confidence: number;
  };
  insights: {
    key: string;
    trend: string;
    risk: string;
    opportunity: string;
  };
  timeRange: string;
  unit: string;
  updatedAt: string;
}

interface PredictiveChartsProps {
  charts?: PredictiveChart[];
  onChartSelect?: (chartId: string) => void;
  onAnomalyClick?: (anomaly: AnomalyDetection) => void;
  onRefresh?: () => void;
  realTimeUpdate?: boolean;
  compactMode?: boolean;
}

const PredictiveCharts: React.FC<PredictiveChartsProps> = ({
  charts = [],
  onChartSelect,
  onAnomalyClick,
  onRefresh,
  realTimeUpdate = true,
  compactMode = false,
}) => {
  // State Management
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('6m');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use provided charts — no mock fallback
  const workingCharts = charts;

  // Filter charts by category
  const filteredCharts = useMemo(() => {
    if (selectedCategory === 'all') return workingCharts;
    return workingCharts.filter(chart => chart.category === selectedCategory);
  }, [workingCharts, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(workingCharts.map(chart => chart.category))];
    return cats;
  }, [workingCharts]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: unknown) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-2 font-medium text-gray-900">{label}</p>
          {payload.map((pld: unknown, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: pld.color }} />
              <span className="text-gray-600">{pld.name}:</span>
              <span className="font-medium text-gray-900">
                {typeof pld.value === 'number' ? pld.value.toLocaleString() : pld.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom anomaly dot
  const AnomalyDot = (props: unknown) => {
    const { cx, cy, payload } = props;
    if (payload.anomaly) {
      return (
        <Dot
          cx={cx}
          cy={cy}
          r={6}
          fill="#ef4444"
          stroke="#dc2626"
          strokeWidth={2}
          className="animate-pulse cursor-pointer"
          onClick={() => {
            const sourceChart = workingCharts[0];
            const anomaly = sourceChart?.anomalies?.find(a => a.period === payload.period);
            if (anomaly) onAnomalyClick?.(anomaly);
          }}
        />
      );
    }
    return null;
  };

  // Render chart based on type
  const renderChart = (chart: PredictiveChart) => {
    const colors = {
      actual: '#3b82f6',
      predicted: '#10b981',
      confidence: '#e5e7eb',
      anomaly: '#ef4444',
    };

    switch (chart.type) {
      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                dataKey="confidence.upper"
                fill={colors.confidence}
                stroke="none"
                name="Confidence Band"
                fillOpacity={0.3}
              />
              <Area dataKey="confidence.lower" fill="#ffffff" stroke="none" fillOpacity={1} />
              <Bar dataKey="actual" fill={colors.actual} name="Actual" opacity={0.8} />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={colors.predicted}
                strokeWidth={3}
                name="Predicted"
                dot={<AnomalyDot />}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={colors.actual}
                strokeWidth={2}
                name="Actual"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={colors.predicted}
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Predicted"
                dot={<AnomalyDot />}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="confidence.upper"
                stackId="1"
                stroke="none"
                fill={colors.confidence}
                fillOpacity={0.3}
                name="Confidence Range"
              />
              <Area
                type="monotone"
                dataKey="confidence.lower"
                stackId="1"
                stroke="none"
                fill="#ffffff"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke={colors.actual}
                fill={colors.actual}
                fillOpacity={0.6}
                name="Actual"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke={colors.predicted}
                fill="none"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Predicted"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Scatter dataKey="actual" fill={colors.actual} name="Current Risk" />
              <Scatter dataKey="predicted" fill={colors.predicted} name="Predicted Risk" />
              <ReferenceLine
                y={7}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label="High Risk Threshold"
              />
              <ReferenceLine
                y={4}
                stroke="#10b981"
                strokeDasharray="3 3"
                label="Low Risk Threshold"
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={colors.predicted}
                strokeWidth={2}
                name="Predicted"
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  // Get trend icon
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh?.();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      setError('Failed to refresh charts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (realTimeUpdate) {
      const interval = setInterval(() => {
        // Simulate real-time updates
        console.log('Updating predictive charts...');
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [realTimeUpdate]);

  if (!workingCharts.length) {
    return (
      <Card>
        <CardContent className="flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Brain className="h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">No predictions available</p>
          <p className="text-xs">Predictive data will appear here once analytics are generated.</p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Predictions
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Brain className="h-6 w-6 text-purple-600" />
              Predictive Analytics
            </h2>
            <p className="text-gray-600">
              AI-powered forecasting with anomaly detection and confidence intervals
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="2y">2 Years</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="mb-1 font-semibold">Error</div>
              <div>{error}</div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {workingCharts.length === 0 && !loading && !error && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold text-muted-foreground">No predictions available</h3>
              <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
                Predictions will appear here once enough data has been collected and analyzed.
              </p>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Predictions
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charts Grid */}
        <div
          className={`grid gap-6 ${
            compactMode ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 xl:grid-cols-2'
          }`}
        >
          <AnimatePresence>
            {filteredCharts.map((chart, index) => (
              <motion.div
                key={chart.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className="border-0 shadow-lg transition-all duration-300 hover:shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-gradient-to-r from-purple-100 to-indigo-100 p-2">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{chart.title}</CardTitle>
                            <p className="text-sm text-gray-600">{chart.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {chart.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {chart.metrics.accuracy}% accurate
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            {getTrendIcon(chart.metrics.trendDirection)}
                            {chart.metrics.trendDirection}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelectedChart(selectedChart === chart.id ? null : chart.id)
                          }
                        >
                          {selectedChart === chart.id ? (
                            <Minimize2 className="h-4 w-4" />
                          ) : (
                            <Maximize2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Chart Visualization */}
                    <div className="w-full">{renderChart(chart)}</div>

                    {/* Anomalies Alert */}
                    {chart.anomalies.length > 0 && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">
                            {chart.anomalies.length} Anomal
                            {chart.anomalies.length === 1 ? 'y' : 'ies'} Detected
                          </span>
                        </div>
                        <div className="space-y-1">
                          {chart.anomalies.slice(0, 2).map((anomaly, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-red-700">
                                {anomaly.period}: {anomaly.deviation > 0 ? '+' : ''}
                                {anomaly.deviation.toFixed(1)}% deviation
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {anomaly.confidence}% sure
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-gray-900">
                          {chart.metrics.confidence}%
                        </div>
                        <div className="text-xs text-gray-600">Confidence</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-gray-900">
                          {chart.metrics.volatility.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">Volatility</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-gray-900">
                          {typeof chart.metrics.nextPeriodPrediction === 'number'
                            ? chart.metrics.nextPeriodPrediction.toLocaleString()
                            : chart.metrics.nextPeriodPrediction}
                        </div>
                        <div className="text-xs text-gray-600">Next Period</div>
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="space-y-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">AI Insights</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <div>
                          <span className="font-medium text-blue-700">Key Finding:</span>
                          <p className="mt-1 text-blue-600">{chart.insights.key}</p>
                        </div>
                        <div>
                          <span className="font-medium text-blue-700">Trend:</span>
                          <p className="mt-1 text-blue-600">{chart.insights.trend}</p>
                        </div>
                        <div>
                          <span className="font-medium text-orange-700">Risk:</span>
                          <p className="mt-1 text-orange-600">{chart.insights.risk}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Opportunity:</span>
                          <p className="mt-1 text-green-600">{chart.insights.opportunity}</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between border-t pt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Updated {new Date(chart.updatedAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3" />
                        <span>{chart.timeRange}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredCharts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 text-center"
          >
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-purple-100 to-indigo-100">
              <BarChart3 className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No Charts Available</h3>
            <p className="mb-4 text-gray-600">
              {loading
                ? 'Loading predictive analytics...'
                : 'No charts match your current filters.'}
            </p>
            {!loading && (
              <Button
                onClick={handleRefresh}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Charts
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PredictiveCharts;
