'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, Download, RefreshCw, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Updated to match forecast-service.ts types
interface DemandForecast {
  id: string;
  org_id: string;
  product_id: string;
  forecast_date: string;
  forecast_horizon: 'daily' | 'weekly' | 'monthly';
  predicted_quantity: number;
  lower_bound: number;
  upper_bound: number;
  confidence_interval: number;
  algorithm_used: string;
  actual_quantity: number | null;
  accuracy_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AccuracyMetricsByHorizon {
  horizon: 'daily' | 'weekly' | 'monthly';
  total_forecasts: number;
  forecasts_with_actuals: number;
  average_accuracy: number;
  median_accuracy: number;
  accuracy_by_range: {
    excellent: number; // > 0.9
    good: number; // 0.7 - 0.9
    fair: number; // 0.5 - 0.7
    poor: number; // < 0.5
  };
  mean_absolute_error: number;
  mean_absolute_percentage_error: number;
}

interface AccuracyMetricsResponse {
  summary: {
    total_forecasts: number;
    total_with_actuals: number;
    overall_average_accuracy: number;
    overall_mape: number;
    horizons_analyzed: number;
  } | null;
  by_horizon: AccuracyMetricsByHorizon[];
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

export default function ForecastViewer() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedHorizon, setSelectedHorizon] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');

  // Fetch REAL products from inventory
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/v1/products?limit=100');
      if (!response.ok) throw new Error('Failed to fetch products');
      const result = await response.json();
      return result.data || [];
    },
  });

  // Fetch forecasts for selected product (returns array of forecasts)
  const {
    data: forecastsData,
    isLoading: forecastLoading,
    refetch: refetchForecast,
  } = useQuery<{ forecasts: DemandForecast[]; total: number }>({
    queryKey: ['ai-forecasts', selectedProductId, selectedHorizon],
    queryFn: async () => {
      if (!selectedProductId) throw new Error('No product selected');

      const response = await fetch(
        `/api/v1/ai/forecasts?productId=${selectedProductId}&granularity=${selectedHorizon}&limit=100`
      );
      if (!response.ok) throw new Error('Failed to fetch forecasts');
      const result = await response.json();
      return { forecasts: result.data || [], total: result.pagination?.total || 0 };
    },
    enabled: !!selectedProductId,
  });

  // Fetch accuracy metrics
  const { data: accuracyMetrics } = useQuery<AccuracyMetricsResponse>({
    queryKey: ['ai-forecast-metrics', selectedHorizon],
    queryFn: async () => {
      const response = await fetch(`/api/v1/ai/forecasts/metrics?horizon=${selectedHorizon}`);
      if (!response.ok) throw new Error('Failed to fetch accuracy metrics');
      const result = await response.json();
      return result.data;
    },
  });

  // Generate forecast for selected product
  const generateForecastMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProductId) throw new Error('No product selected');

      const response = await fetch('/api/v1/ai/forecasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          granularity: selectedHorizon,
          horizon: selectedHorizon === 'daily' ? 30 : selectedHorizon === 'weekly' ? 12 : 6,
          includeConfidenceIntervals: true,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate forecast');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-forecasts'] });
      toast.success('Forecast generated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate: ${error.message}`);
    },
  });

  // Export forecast data
  const handleExport = () => {
    if (!forecastsData?.forecasts.length) return;

    const csvData = [
      ['Date', 'Predicted Quantity', 'Lower Bound', 'Upper Bound', 'Actual Quantity', 'Accuracy Score'],
      ...forecastsData.forecasts.map((f) => [
        f.forecast_date,
        f.predicted_quantity,
        f.lower_bound,
        f.upper_bound,
        f.actual_quantity ?? '',
        f.accuracy_score ?? '',
      ]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast-${selectedProductId}-${selectedHorizon}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Forecast exported successfully');
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Transform forecasts into chart data format
  const chartData = forecastsData?.forecasts.map((f) => ({
    date: f.forecast_date,
    predicted_quantity: f.predicted_quantity,
    lower_bound: f.lower_bound,
    upper_bound: f.upper_bound,
    actual_quantity: f.actual_quantity,
  })) || [];

  // Get current horizon metrics
  const currentMetrics = accuracyMetrics?.by_horizon.find(
    (m) => m.horizon === selectedHorizon
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Forecast Viewer</h2>
          <p className="text-muted-foreground">
            Visualize demand forecasts with confidence intervals
          </p>
        </div>
        <Button
          onClick={() => generateForecastMutation.mutate()}
          disabled={generateForecastMutation.isPending || !selectedProductId}
        >
          {generateForecastMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Generate Forecast
        </Button>
      </div>

      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Product</CardTitle>
          <CardDescription>Choose a product to view its demand forecast</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horizon</Label>
              <Tabs value={selectedHorizon} onValueChange={(v) => setSelectedHorizon(v as 'daily' | 'weekly' | 'monthly')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProductId && (
        <>
          {/* Accuracy Metrics */}
          {currentMetrics && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(currentMetrics.average_accuracy * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentMetrics.forecasts_with_actuals} of {currentMetrics.total_forecasts} with actuals
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MAPE</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(currentMetrics.mean_absolute_percentage_error * 100).toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Mean Absolute % Error</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MAE</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {currentMetrics.mean_absolute_error.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Mean Absolute Error</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Forecast Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Demand Forecast</CardTitle>
                  <CardDescription>
                    {selectedProduct?.name} - {selectedHorizon} forecast
                    {forecastsData?.forecasts.length && (
                      <span className="ml-2">
                        ({forecastsData.forecasts.length} data points)
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchForecast()}
                    disabled={forecastLoading}
                  >
                    {forecastLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={!forecastsData?.forecasts.length}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {forecastLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(date) => format(new Date(date), 'PPP')}
                      formatter={(value: number) => [value.toFixed(0), '']}
                    />
                    <Legend />

                    {/* Confidence Interval Area */}
                    <Area
                      type="monotone"
                      dataKey="upper_bound"
                      stackId="1"
                      stroke="none"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.1}
                      name="Upper Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="lower_bound"
                      stackId="1"
                      stroke="none"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.1}
                      name="Lower Bound"
                    />

                    {/* Predicted Line */}
                    <Line
                      type="monotone"
                      dataKey="predicted_quantity"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Predicted"
                    />

                    {/* Actual Line (if available) */}
                    <Line
                      type="monotone"
                      dataKey="actual_quantity"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      name="Actual"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center p-12">
                  <p className="text-muted-foreground">No forecast data available. Generate a forecast to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forecast Details */}
          {forecastsData && forecastsData.forecasts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Forecast Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Total Forecasts</Label>
                    <div className="mt-1 text-sm font-medium">
                      {forecastsData.forecasts.length}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Horizon</Label>
                    <div className="mt-1 text-sm font-medium capitalize">
                      {selectedHorizon}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">With Actuals</Label>
                    <div className="mt-1 text-sm font-medium">
                      {forecastsData.forecasts.filter(f => f.actual_quantity !== null).length}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Algorithm</Label>
                    <div className="mt-1 text-sm font-medium">
                      {forecastsData.forecasts[0]?.algorithm_used || 'N/A'}
                    </div>
                  </div>
                </div>

                {forecastsData.forecasts[0]?.metadata && (
                  <div className="mt-4">
                    <Label className="text-sm text-muted-foreground">AI Metadata</Label>
                    <pre className="mt-1 rounded-md bg-muted p-4 text-sm overflow-auto max-h-32">
                      {JSON.stringify(forecastsData.forecasts[0].metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
