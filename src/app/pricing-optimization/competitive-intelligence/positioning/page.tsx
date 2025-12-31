'use client';

import React, { useState } from 'react';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  DollarSign,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency-formatter';

interface PricePositioning {
  currency?: string;
  internalPrice: number;
  competitorPrices: Array<{
    competitorId: string;
    competitorName: string;
    price: number;
    currency: string;
    observedAt: string;
  }>;
  rank: number;
  percentile: number;
  spread: number;
  marketMedian: number;
  marketAverage: number;
  position: 'lowest' | 'below_median' | 'at_median' | 'above_median' | 'highest';
}

export default function PricePositioningPage() {
  const [productId, setProductId] = useState<string>('');
  const [positioning, setPositioning] = useState<PricePositioning | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositioning = async () => {
    if (!productId) {
      setError('Please select a product');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/pricing-intel/price-positioning?productId=${productId}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error.message);
        setPositioning(null);
      } else {
        setPositioning(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price positioning');
      setPositioning(null);
    } finally {
      setLoading(false);
    }
  };

  const chartData = positioning
    ? [
        ...positioning.competitorPrices.map(cp => ({
          name: cp.competitorName,
          price: cp.price,
          type: 'competitor' as const,
        })),
        {
          name: 'Our Price',
          price: positioning.internalPrice,
          type: 'internal' as const,
        },
      ].sort((a, b) => a.price - b.price)
    : [];

  const getPositionBadge = () => {
    if (!positioning) return null;

    const variants: Record<
      PricePositioning['position'],
      { variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }
    > = {
      lowest: { variant: 'destructive', icon: <TrendingDown className="h-3 w-3" /> },
      below_median: { variant: 'secondary', icon: <TrendingDown className="h-3 w-3" /> },
      at_median: { variant: 'default', icon: <Target className="h-3 w-3" /> },
      above_median: { variant: 'secondary', icon: <TrendingUp className="h-3 w-3" /> },
      highest: { variant: 'destructive', icon: <TrendingUp className="h-3 w-3" /> },
    };

    const config = variants[positioning.position];

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {positioning.position.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <AppLayout
      title="Price Positioning"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        {
          label: 'Competitive Intelligence',
          href: '/pricing-optimization/competitive-intelligence',
        },
        { label: 'Price Positioning' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Price Positioning</h1>
            <p className="text-muted-foreground mt-1">
              Analyze where your prices rank against competitors
            </p>
          </div>
        </div>

        {/* Product Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Product</CardTitle>
            <CardDescription>Choose a product to analyze price positioning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
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
              <Button onClick={fetchPositioning} disabled={loading || !productId}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {positioning && (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Our Price</CardTitle>
                  <DollarSign className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(positioning.internalPrice, positioning.currency || 'ZAR')}</div>
                  <div className="mt-2 flex items-center gap-2">{getPositionBadge()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Market Rank</CardTitle>
                  <Target className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    #{positioning.rank} / {positioning.competitorPrices.length + 1}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {positioning.percentile.toFixed(1)} percentile
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Market Median</CardTitle>
                  <BarChart3 className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(positioning.marketMedian, positioning.currency || 'ZAR')}</div>
                  <p className="text-muted-foreground text-xs">
                    {formatCurrency(positioning.marketAverage, positioning.currency || 'ZAR')} average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Price Spread</CardTitle>
                  <TrendingUp className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(positioning.spread, positioning.currency || 'ZAR')}</div>
                  <p className="text-muted-foreground text-xs">Range</p>
                </CardContent>
              </Card>
            </div>

            {/* Price Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Price Comparison</CardTitle>
                <CardDescription>
                  Visual comparison of prices across all competitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value, positioning?.currency || 'ZAR')}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <ReferenceLine
                      y={positioning.marketMedian}
                      stroke="#8884d8"
                      strokeDasharray="3 3"
                      label="Median"
                    />
                    <ReferenceLine
                      y={positioning.marketAverage}
                      stroke="#82ca9d"
                      strokeDasharray="3 3"
                      label="Average"
                    />
                    {chartData.map((entry, index) => (
                      <Bar
                        key={index}
                        dataKey="price"
                        fill={entry.type === 'internal' ? '#ef4444' : '#3b82f6'}
                        name={entry.type === 'internal' ? 'Our Price' : 'Competitor'}
                        radius={[4, 4, 0, 0]}
                        fillOpacity={0.8}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Competitor Details */}
            <Card>
              <CardHeader>
                <CardTitle>Competitor Prices</CardTitle>
                <CardDescription>Detailed breakdown by competitor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {positioning.competitorPrices.map(cp => {
                    const diff = cp.price - positioning.internalPrice;
                    const diffPercent = (diff / positioning.internalPrice) * 100;

                    return (
                      <div
                        key={cp.competitorId}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <div className="font-medium">{cp.competitorName}</div>
                          <div className="text-muted-foreground text-sm">
                            Observed: {new Date(cp.observedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatCurrency(cp.price, cp.currency || positioning?.currency || 'ZAR')}</div>
                          {diff !== 0 && (
                            <div
                              className={`text-sm ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}
                            >
                              {diff > 0 ? '+' : ''}
                              {diffPercent.toFixed(1)}% vs us
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
