'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface Forecast {
  id: string;
  product_id: string;
  horizon: number;
  granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  forecast_data: Array<{
    date: string;
    predicted_quantity: number;
    confidence_lower: number;
    confidence_upper: number;
    actual_quantity?: number;
  }>;
  metadata: any;
  created_at: string;
  expires_at: string;
}

interface AccuracyMetrics {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Squared Error
  accuracy: number;
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
    'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  >('daily');

  // Fetch products (mock - would come from products API)
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      // Mock data - in real app, fetch from /api/products
      return [
        { id: '1', name: 'Product A', sku: 'SKU-001' },
        { id: '2', name: 'Product B', sku: 'SKU-002' },
        { id: '3', name: 'Product C', sku: 'SKU-003' },
      ];
    },
  });

  // Fetch forecast for selected product
  const {
    data: forecast,
    isLoading: forecastLoading,
    refetch: refetchForecast,
  } = useQuery<Forecast>({
    queryKey: ['ai-forecast', selectedProductId, selectedHorizon],
    queryFn: async () => {
      if (!selectedProductId) throw new Error('No product selected');

      const response = await fetch(
        `/api/v1/ai/forecasts/product/${selectedProductId}?granularity=${selectedHorizon}`
      );
      if (!response.ok) throw new Error('Failed to fetch forecast');
      const data = await response.json();
      return data.data;
    },
    enabled: !!selectedProductId,
  });

  // Fetch accuracy metrics
  const { data: accuracy } = useQuery<AccuracyMetrics>({
    queryKey: ['ai-forecast-accuracy', selectedProductId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/ai/forecasts/accuracy?productId=${selectedProductId}`);
      if (!response.ok) throw new Error('Failed to fetch accuracy');
      const data = await response.json();
      return data.data || { mape: 0, rmse: 0, accuracy: 0 };
    },
    enabled: !!selectedProductId,
  });

  // Generate bulk forecasts
  const bulkGenerateMutation = useMutation({
    mutationFn: async () => {
      const productIds = products.map((p) => p.id);
      const response = await fetch('/api/v1/ai/forecasts/generate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          horizon: 30,
          granularity: 'daily',
        }),
      });
      if (!response.ok) throw new Error('Failed to generate forecasts');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-forecast'] });
      toast.success('Bulk forecasts generated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate: ${error.message}`);
    },
  });

  // Export forecast data
  const handleExport = () => {
    if (!forecast) return;

    const csvData = [
      ['Date', 'Predicted Quantity', 'Lower Bound', 'Upper Bound', 'Actual Quantity'],
      ...forecast.forecast_data.map((d) => [
        d.date,
        d.predicted_quantity,
        d.confidence_lower,
        d.confidence_upper,
        d.actual_quantity || '',
      ]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast-${selectedProductId}-${selectedHorizon}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Forecast exported successfully');
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

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
          onClick={() => bulkGenerateMutation.mutate()}
          disabled={bulkGenerateMutation.isPending}
        >
          {bulkGenerateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Generate Bulk Forecasts
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
              <Tabs value={selectedHorizon} onValueChange={(v) => setSelectedHorizon(v as any)}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProductId && (
        <>
          {/* Accuracy Metrics */}
          {accuracy && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(accuracy.accuracy * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Overall forecast accuracy</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MAPE</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{accuracy.mape.toFixed(2)}%</div>
                  <p className="text-xs text-muted-foreground">Mean Absolute % Error</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">RMSE</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{accuracy.rmse.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Root Mean Squared Error</p>
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
                    {forecast && (
                      <span className="ml-2">
                        (Generated: {format(new Date(forecast.created_at), 'PPp')})
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
                    disabled={!forecast}
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
              ) : forecast && forecast.forecast_data ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={forecast.forecast_data}>
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
                      dataKey="confidence_upper"
                      stackId="1"
                      stroke="none"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.1}
                      name="Upper Confidence"
                    />
                    <Area
                      type="monotone"
                      dataKey="confidence_lower"
                      stackId="1"
                      stroke="none"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.1}
                      name="Lower Confidence"
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
                  <p className="text-muted-foreground">No forecast data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forecast Details */}
          {forecast && (
            <Card>
              <CardHeader>
                <CardTitle>Forecast Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Horizon</Label>
                    <div className="mt-1 text-sm font-medium">
                      {forecast.horizon} {forecast.granularity} periods
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Granularity</Label>
                    <div className="mt-1 text-sm font-medium capitalize">
                      {forecast.granularity}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Data Points</Label>
                    <div className="mt-1 text-sm font-medium">
                      {forecast.forecast_data.length}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Expires</Label>
                    <div className="mt-1 text-sm font-medium">
                      {format(new Date(forecast.expires_at), 'PPp')}
                    </div>
                  </div>
                </div>

                {forecast.metadata && (
                  <div className="mt-4">
                    <Label className="text-sm text-muted-foreground">Additional Metadata</Label>
                    <pre className="mt-1 rounded-md bg-muted p-4 text-sm overflow-auto max-h-32">
                      {JSON.stringify(forecast.metadata, null, 2)}
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
