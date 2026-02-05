'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, Database } from 'lucide-react';

type SchemaMode = 'core' | 'legacy' | 'demo';

interface TagAnalytics {
  tagId: string;
  tagName: string;
  totalSales: number;
  totalTurnover: number;
  totalMargin: number;
  productCount: number;
  avgPrice: number;
}

interface SeasonalityData {
  month: string;
  sales: number;
  turnover: number;
  margin: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Demo constants removed — empty states shown when API returns no data

export default function AnalyticsPage() {
  const [tagAnalytics, setTagAnalytics] = useState<TagAnalytics[]>([]);
  const [seasonalityData, setSeasonalityData] = useState<SeasonalityData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [schemaMode, setSchemaMode] = useState<SchemaMode>('demo');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tags/analytics?tag=${selectedTag}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setTagAnalytics(data.tagAnalytics || []);
      setSeasonalityData(data.seasonalityData || []);
      setCategoryData(data.categoryData || []);
      setIsDemoMode(data.isDemoMode || false);
      setSchemaMode(data.mode ?? (data.isDemoMode ? 'demo' : 'legacy'));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDemoMode(false);
      setTagAnalytics([]);
      setSeasonalityData([]);
      setCategoryData([]);
      setSchemaMode('demo');
    } finally {
      setLoading(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const totalAssignments = useMemo(
    () => tagAnalytics.reduce((sum, tag) => sum + (tag.productCount || 0), 0),
    [tagAnalytics]
  );
  const totalSales = tagAnalytics.reduce((sum, tag) => sum + (tag.totalSales || 0), 0);
  const totalTurnover = tagAnalytics.reduce((sum, tag) => sum + (tag.totalTurnover || 0), 0);
  const totalMargin = tagAnalytics.reduce((sum, tag) => sum + (tag.totalMargin || 0), 0);
  const avgMarginPercent =
    totalTurnover > 0 && totalMargin > 0
      ? Number(((totalMargin / totalTurnover) * 100).toFixed(1))
      : 0;

  if (loading) {
    return (
      <AppLayout
        title="Analytics & Insights"
        breadcrumbs={[
          { label: 'Category Management', href: '/catalog/categories' },
          { label: 'Analytics' },
        ]}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Insights</h1>
            <p className="text-muted-foreground">Performance metrics and trends</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="mb-2 h-8 w-24" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Analytics & Insights"
      breadcrumbs={[
        { label: 'Category Management', href: '/catalog/categories' },
        { label: 'Analytics' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Insights</h1>
            <p className="text-muted-foreground">
              {schemaMode === 'core'
                ? 'Live metrics derived from supplier product tags.'
                : 'Sales performance and tag engagement trends.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-2">
              <Database className="h-3 w-3" />
              {schemaMode === 'core'
                ? 'Core schema'
                : schemaMode === 'legacy'
                  ? 'Legacy schema'
                  : 'Demo mode'}
            </Badge>
            {isDemoMode && (
              <Badge variant="secondary" className="flex items-center gap-2">
                <Database className="h-3 w-3" />
                Demo Data
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}. Showing fallback data.</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {schemaMode === 'core' ? 'Tag Assignments' : 'Total Sales'}
              </CardTitle>
              <Package className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {schemaMode === 'core'
                  ? totalAssignments.toLocaleString()
                  : totalSales.toLocaleString()}
              </div>
              <p className="text-muted-foreground text-xs">
                <TrendingUp className="mr-1 inline h-3 w-3" />
                {schemaMode === 'core'
                  ? 'Current manual & automated assignments'
                  : '+12% from last month'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Turnover</CardTitle>
              <DollarSign className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalTurnover.toLocaleString()}</div>
              <p className="text-muted-foreground text-xs">
                <TrendingUp className="mr-1 inline h-3 w-3" />
                {schemaMode === 'core'
                  ? 'Estimated using latest price data'
                  : '+8% from last month'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Margin</CardTitle>
              <TrendingUp className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {schemaMode === 'core' ? '—' : `$${totalMargin.toLocaleString()}`}
              </div>
              <p className="text-muted-foreground text-xs">
                <TrendingDown className="mr-1 inline h-3 w-3" />
                {schemaMode === 'core'
                  ? 'Margin tracking requires sales ledger'
                  : '-2% from last month'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin %</CardTitle>
              <TrendingUp className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {schemaMode === 'core' ? '—' : `${avgMarginPercent}%`}
              </div>
              <p className="text-muted-foreground text-xs">
                <TrendingUp className="mr-1 inline h-3 w-3" />
                {schemaMode === 'core' ? 'Requires sales data to compute' : '+0.5% from last month'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tag Performance</CardTitle>
              <CardDescription>
                {schemaMode === 'core'
                  ? 'Product counts and estimated value per tag'
                  : 'Sales, turnover, and margin'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tagAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tagName" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (schemaMode === 'core') {
                        if (name === 'productCount') return [value, 'Products'];
                        return [`$${Number(value).toLocaleString()}`, 'Estimated Value'];
                      }
                      return [
                        name === 'totalSales' ? value : `$${Number(value).toLocaleString()}`,
                        name === 'totalSales'
                          ? 'Sales'
                          : name === 'totalTurnover'
                            ? 'Turnover'
                            : 'Margin',
                      ];
                    }}
                  />
                  {schemaMode === 'core' ? (
                    <>
                      <Bar dataKey="productCount" fill="#8884d8" name="Products" />
                      <Bar dataKey="totalTurnover" fill="#82ca9d" name="Estimated Value" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="totalSales" fill="#8884d8" name="Sales" />
                      <Bar dataKey="totalTurnover" fill="#82ca9d" name="Turnover" />
                      <Bar dataKey="totalMargin" fill="#ffc658" name="Margin" />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>
                {schemaMode === 'core'
                  ? 'Products by category with matching tags'
                  : 'Margin contribution by category'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData as unknown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: unknown) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Seasonality Analysis</CardTitle>
              <CardDescription>
                {schemaMode === 'core' ? 'Monthly tag assignments' : 'Monthly sales trends'}
              </CardDescription>
            </div>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tagAnalytics.map(tag => (
                  <SelectItem key={tag.tagId} value={tag.tagId}>
                    {tag.tagName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={seasonalityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    if (schemaMode === 'core') {
                      return [value, name === 'sales' ? 'Assignments' : 'Value'];
                    }
                    return [
                      name === 'sales' ? value : `$${Number(value).toLocaleString()}`,
                      name === 'sales' ? 'Sales' : name === 'turnover' ? 'Turnover' : 'Margin',
                    ];
                  }}
                />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="turnover" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="margin" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tag Performance Details</CardTitle>
            <CardDescription>Detailed metrics for each tag</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Tag</th>
                    <th className="p-2 text-right">Products</th>
                    <th className="p-2 text-right">
                      {schemaMode === 'core' ? 'Assignments' : 'Sales'}
                    </th>
                    <th className="p-2 text-right">Turnover</th>
                    <th className="p-2 text-right">Margin</th>
                    <th className="p-2 text-right">Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {tagAnalytics.map(tag => (
                    <tr key={tag.tagId} className="border-b">
                      <td className="p-2">
                        <Badge variant="outline">{tag.tagName}</Badge>
                      </td>
                      <td className="p-2 text-right">{tag.productCount}</td>
                      <td className="p-2 text-right">
                        {schemaMode === 'core'
                          ? tag.productCount.toLocaleString()
                          : tag.totalSales.toLocaleString()}
                      </td>
                      <td className="p-2 text-right">${tag.totalTurnover.toLocaleString()}</td>
                      <td className="p-2 text-right">
                        {schemaMode === 'core' ? '—' : `$${tag.totalMargin.toLocaleString()}`}
                      </td>
                      <td className="p-2 text-right">
                        {schemaMode === 'core'
                          ? `$${tag.avgPrice.toFixed(2)}`
                          : `$${tag.avgPrice.toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
