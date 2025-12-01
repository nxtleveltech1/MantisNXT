'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Loader2, BarChart3, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface TrendData {
  historical: Array<{
    date: string;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    dataPoints: number;
  }>;
  forecast: Array<{
    date: string;
    predictedPrice: number;
    confidence: number;
  }>;
  seasonalPatterns: Array<{
    period: string;
    averageChange: number;
    frequency: number;
  }>;
  trends: {
    slope?: number;
    intercept?: number;
    direction?: 'upward' | 'downward' | 'stable';
    strength?: 'strong' | 'moderate' | 'weak';
  };
}

export default function TrendsPage() {
  const [productId, setProductId] = useState<string>('');
  const [forecastDays, setForecastDays] = useState<number>(30);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchTrends();
    }
  }, [productId, forecastDays]);

  const fetchTrends = async () => {
    if (!productId) {
      setError('Please select a product');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        productId,
        forecastDays: forecastDays.toString(),
      });

      const response = await fetch(`/api/v1/pricing-intel/trends?${params}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error.message);
        setTrendData(null);
      } else {
        setTrendData(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trend analysis');
      setTrendData(null);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data combining historical and forecast
  const chartData = React.useMemo(() => {
    if (!trendData) return [];

    const historical = trendData.historical.map(h => ({
      date: h.date,
      dateFormatted: format(new Date(h.date), 'MMM dd'),
      price: h.averagePrice,
      minPrice: h.minPrice,
      maxPrice: h.maxPrice,
      type: 'historical' as const,
      confidence: 100,
    }));

    const forecast = trendData.forecast.map(f => ({
      date: f.date,
      dateFormatted: format(new Date(f.date), 'MMM dd'),
      price: f.predictedPrice,
      type: 'forecast' as const,
      confidence: f.confidence,
    }));

    return [...historical, ...forecast];
  }, [trendData]);

  return (
    <AppLayout
      title="Trend Analysis & Forecasting"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        {
          label: 'Competitive Intelligence',
          href: '/pricing-optimization/competitive-intelligence',
        },
        { label: 'Trend Analysis' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trend Analysis & Forecasting</h1>
            <p className="text-muted-foreground mt-1">
              Historical trend analysis and seasonal pricing pattern forecasting
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Parameters</CardTitle>
            <CardDescription>Select product and forecast period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO: Fetch products from API */}
                  <SelectItem value="product-1">Product 1</SelectItem>
                  <SelectItem value="product-2">Product 2</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={forecastDays.toString()}
                onValueChange={v => setForecastDays(parseInt(v, 10))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={fetchTrends} disabled={loading || !productId}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Trends'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {trendData && (
          <>
            {/* Trend Summary */}
            {trendData.trends.direction && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Trend Direction</CardTitle>
                    {trendData.trends.direction === 'upward' ? (
                      <TrendingUp className="h-4 w-4 text-red-600" />
                    ) : trendData.trends.direction === 'downward' ? (
                      <TrendingDown className="h-4 w-4 text-green-600" />
                    ) : (
                      <Activity className="h-4 w-4 text-blue-600" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize">
                      {trendData.trends.direction}
                    </div>
                    <Badge variant="secondary" className="mt-2">
                      {trendData.trends.strength || 'unknown'} trend
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Historical Data Points</CardTitle>
                    <Calendar className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{trendData.historical.length}</div>
                    <p className="text-muted-foreground text-xs">Days analyzed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Seasonal Patterns</CardTitle>
                    <BarChart3 className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{trendData.seasonalPatterns.length}</div>
                    <p className="text-muted-foreground text-xs">Patterns detected</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Historical & Forecast Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Price Trends & Forecast</CardTitle>
                  <CardDescription>
                    Historical pricing data with {forecastDays}-day forecast projection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={500}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="dateFormatted"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={value => `$${value.toFixed(2)}`}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `$${value?.toFixed(2) || 'N/A'}`,
                          name,
                        ]}
                        labelFormatter={label => format(new Date(label), 'PPP')}
                      />
                      <Legend />
                      {/* Historical data area */}
                      <Area
                        type="monotone"
                        dataKey="minPrice"
                        fill="#e5e7eb"
                        stroke="none"
                        name="Price Range (Min)"
                        opacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="maxPrice"
                        fill="#e5e7eb"
                        stroke="none"
                        name="Price Range (Max)"
                        opacity={0.3}
                      />
                      {/* Historical price line */}
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        name="Historical Average"
                        connectNulls
                        strokeDasharray={chartData.some(d => d.type === 'forecast') ? '0' : '0'}
                      />
                      {/* Forecast line */}
                      {trendData.forecast.length > 0 && (
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 3, fill: '#10b981' }}
                          name="Forecast"
                          connectNulls
                          data={chartData.filter(d => d.type === 'forecast')}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Seasonal Patterns */}
            {trendData.seasonalPatterns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Seasonal Pricing Patterns</CardTitle>
                  <CardDescription>Detected monthly patterns in historical pricing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {trendData.seasonalPatterns.map((pattern, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <div className="font-medium">{pattern.period}</div>
                          <div className="text-muted-foreground text-sm">
                            {pattern.frequency} observations
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              pattern.averageChange > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {pattern.averageChange > 0 ? '+' : ''}
                            {pattern.averageChange.toFixed(1)}%
                          </div>
                          <Badge variant={pattern.averageChange > 0 ? 'destructive' : 'default'}>
                            {pattern.averageChange > 0 ? 'Higher' : 'Lower'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Forecast Details */}
            {trendData.forecast.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Forecast Details</CardTitle>
                  <CardDescription>
                    Predicted prices for the next {forecastDays} days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] space-y-2 overflow-y-auto">
                    {trendData.forecast.slice(0, 14).map((forecast, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium">
                            {format(new Date(forecast.date), 'PPP')}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Confidence: {forecast.confidence}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${forecast.predictedPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}





