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
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';

interface PriceHistoryData {
  internalPriceHistory: Array<{
    date: string;
    price: number;
    previousPrice: number | null;
    change: number;
    changePercent: number;
  }>;
  competitorPriceHistory: Array<{
    date: string;
    competitor: string;
    competitorId: string;
    price: number;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function PriceHistoryPage() {
  const [productId, setProductId] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [history, setHistory] = useState<PriceHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;

    switch (dateRange) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        return {
          start: customStart || undefined,
          end: customEnd || undefined,
        };
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  };

  const fetchHistory = async () => {
    if (!productId) {
      setError('Please select a product');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const range = getDateRange();
      const params = new URLSearchParams({
        productId,
        ...(range.start && { startDate: range.start }),
        ...(range.end && { endDate: range.end }),
      });

      const response = await fetch(`/api/v1/pricing-intel/price-history?${params}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error.message);
        setHistory(null);
      } else {
        setHistory(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price history');
      setHistory(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchHistory();
    }
  }, [productId, dateRange]);

  // Prepare chart data - merge all prices by date
  const chartData = React.useMemo(() => {
    if (!history) return [];

    // Get unique dates
    const dates = new Set<string>();
    history.internalPriceHistory.forEach(h => dates.add(h.date.split('T')[0]));
    history.competitorPriceHistory.forEach(h => dates.add(h.date.split('T')[0]));

    const sortedDates = Array.from(dates).sort();

    // Group competitor prices by competitor
    const competitorGroups = new Map<string, Map<string, number>>();
    history.competitorPriceHistory.forEach(h => {
      const dateKey = h.date.split('T')[0];
      if (!competitorGroups.has(h.competitor)) {
        competitorGroups.set(h.competitor, new Map());
      }
      competitorGroups.get(h.competitor)!.set(dateKey, h.price);
    });

    // Build chart data points
    return sortedDates.map(date => {
      const internal = history.internalPriceHistory.find(h => h.date.split('T')[0] === date);
      const dataPoint: Record<string, unknown> = {
        date,
        dateFormatted: format(new Date(date), 'MMM dd'),
        ourPrice: internal?.price || null,
      };

      // Add competitor prices
      competitorGroups.forEach((priceMap, competitorName) => {
        const price = priceMap.get(date);
        if (price !== undefined) {
          dataPoint[competitorName] = price;
        }
      });

      return dataPoint;
    });
  }, [history]);

  const competitors = React.useMemo(() => {
    if (!history) return [];
    return Array.from(new Set(history.competitorPriceHistory.map(h => h.competitor)));
  }, [history]);

  const colors = [
    '#ef4444', // red (our price)
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ];

  return (
    <AppLayout
      title="Price History"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        {
          label: 'Competitive Intelligence',
          href: '/pricing-optimization/competitive-intelligence',
        },
        { label: 'Price History' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Price History</h1>
            <p className="text-muted-foreground mt-1">
              Track historical price trends and competitor pricing over time
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select product and date range to analyze</CardDescription>
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

              <Select value={dateRange} onValueChange={v => setDateRange(v as typeof dateRange)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>

              {dateRange === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="rounded-md border px-3 py-2"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="rounded-md border px-3 py-2"
                  />
                </>
              )}

              <Button onClick={fetchHistory} disabled={loading || !productId}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Refresh'
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

        {history && chartData.length > 0 && (
          <>
            {/* Price History Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Price Trends Over Time</CardTitle>
                    <CardDescription>Historical price comparison with competitors</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                        name === 'ourPrice' ? 'Our Price' : name,
                      ]}
                      labelFormatter={label => format(new Date(label), 'PPP')}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    {/* Our Price Line */}
                    <Line
                      type="monotone"
                      dataKey="ourPrice"
                      stroke={colors[0]}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Our Price"
                      connectNulls
                    />
                    {/* Competitor Price Lines */}
                    {competitors.map((competitor, index) => (
                      <Line
                        key={competitor}
                        type="monotone"
                        dataKey={competitor}
                        stroke={colors[(index % (colors.length - 1)) + 1]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={competitor}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Price Change</CardTitle>
                  {history.internalPriceHistory.length > 0 &&
                    (history.internalPriceHistory[history.internalPriceHistory.length - 1]
                      .changePercent >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ))}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {history.internalPriceHistory.length > 0
                      ? `${history.internalPriceHistory[history.internalPriceHistory.length - 1].changePercent >= 0 ? '+' : ''}${history.internalPriceHistory[history.internalPriceHistory.length - 1].changePercent.toFixed(1)}%`
                      : '0%'}
                  </div>
                  <p className="text-muted-foreground text-xs">Since period start</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                  <Calendar className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {history.internalPriceHistory.length + history.competitorPriceHistory.length}
                  </div>
                  <p className="text-muted-foreground text-xs">Total observations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
                  <DollarSign className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{competitors.length}</div>
                  <p className="text-muted-foreground text-xs">Active monitoring</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Changes Table */}
            {history.internalPriceHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Price Changes</CardTitle>
                  <CardDescription>Internal price change history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {history.internalPriceHistory
                      .slice(-10)
                      .reverse()
                      .map((change, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <div className="font-medium">
                              {format(new Date(change.date), 'PPP')}
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {change.previousPrice
                                ? `From $${change.previousPrice.toFixed(2)}`
                                : 'Initial price'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">${change.price.toFixed(2)}</div>
                            {change.change !== 0 && (
                              <Badge
                                variant={change.change > 0 ? 'destructive' : 'default'}
                                className={
                                  change.change > 0
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                                }
                              >
                                {change.change > 0 ? '+' : ''}
                                {change.changePercent.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {history && chartData.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-muted-foreground py-8 text-center">
                No price history data available for the selected product and date range.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}





