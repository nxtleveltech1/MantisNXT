"use client"

import { useState, useEffect } from "react"
import AppLayout from "@/components/layout/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
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
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, Database } from "lucide-react"

interface TagAnalytics {
  tagId: string
  tagName: string
  totalSales: number
  totalTurnover: number
  totalMargin: number
  productCount: number
  avgPrice: number
}

interface SeasonalityData {
  month: string
  sales: number
  turnover: number
  margin: number
}

interface CategoryData {
  name: string
  value: number
  color: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export default function AnalyticsPage() {
  const [tagAnalytics, setTagAnalytics] = useState<TagAnalytics[]>([])
  const [seasonalityData, setSeasonalityData] = useState<SeasonalityData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [selectedTag, setSelectedTag] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [selectedTag])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/tags/analytics?tag=${selectedTag}`)
      if (!response.ok) {
        throw new Error("Failed to fetch analytics data")
      }

      const data = await response.json()
      setTagAnalytics(data.tagAnalytics || [])
      setSeasonalityData(data.seasonalityData || [])
      setCategoryData(data.categoryData || [])
      setIsDemoMode(data.isDemoMode || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      // Fallback to demo data
      setTagAnalytics([
        {
          tagId: "tag-instruments",
          tagName: "Instruments",
          totalSales: 1250,
          totalTurnover: 125000,
          totalMargin: 31250,
          productCount: 45,
          avgPrice: 899.99,
        },
        {
          tagId: "tag-acoustic",
          tagName: "Acoustic",
          totalSales: 680,
          totalTurnover: 68000,
          totalMargin: 17000,
          productCount: 23,
          avgPrice: 599.99,
        },
        {
          tagId: "tag-electric",
          tagName: "Electric",
          totalSales: 420,
          totalTurnover: 84000,
          totalMargin: 21000,
          productCount: 15,
          avgPrice: 1299.99,
        },
      ])
      setSeasonalityData([
        { month: "Jan", sales: 120, turnover: 12000, margin: 3000 },
        { month: "Feb", sales: 98, turnover: 9800, margin: 2450 },
        { month: "Mar", sales: 145, turnover: 14500, margin: 3625 },
        { month: "Apr", sales: 167, turnover: 16700, margin: 4175 },
        { month: "May", sales: 189, turnover: 18900, margin: 4725 },
        { month: "Jun", sales: 234, turnover: 23400, margin: 5850 },
      ])
      setCategoryData([
        { name: "Guitars", value: 45, color: "#0088FE" },
        { name: "Pianos", value: 25, color: "#00C49F" },
        { name: "Drums", value: 20, color: "#FFBB28" },
        { name: "Accessories", value: 10, color: "#FF8042" },
      ])
      setIsDemoMode(true)
    } finally {
      setLoading(false)
    }
  }

  const totalSales = tagAnalytics.reduce((sum, tag) => sum + tag.totalSales, 0)
  const totalTurnover = tagAnalytics.reduce((sum, tag) => sum + tag.totalTurnover, 0)
  const totalMargin = tagAnalytics.reduce((sum, tag) => sum + tag.totalMargin, 0)
  const avgMarginPercent = totalTurnover > 0 ? (totalMargin / totalTurnover) * 100 : 0

  if (loading) {
    return (
      <AppLayout title="Analytics & Insights" breadcrumbs={[{ label: "Category Management", href: "/catalog/categories" }, { label: "Analytics" }]}>
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
                  <Skeleton className="h-8 w-24 mb-2" />
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
    )
  }

  return (
    <AppLayout title="Analytics & Insights" breadcrumbs={[{ label: "Category Management", href: "/catalog/categories" }, { label: "Analytics" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Insights</h1>
            <p className="text-muted-foreground">Performance metrics and trends</p>
          </div>
          {isDemoMode && (
            <Badge variant="outline" className="flex items-center gap-2">
              <Database className="h-3 w-3" />
              Demo Mode
            </Badge>
          )}
        </div>

        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}. Showing demo data instead.</AlertDescription>
          </Alert>
        )}

        {isDemoMode && (
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              You're viewing demo data. Connect your Neon database to see live analytics.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSales.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Turnover</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalTurnover.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +8% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMargin.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingDown className="inline h-3 w-3 mr-1" />
                -2% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin %</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMarginPercent.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +0.5% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tag Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Tag Performance</CardTitle>
              <CardDescription>Sales, turnover, and margin by tag</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tagAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tagName" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "totalSales" ? value : `$${Number(value).toLocaleString()}`,
                      name === "totalSales" ? "Sales" : name === "totalTurnover" ? "Turnover" : "Margin",
                    ]}
                  />
                  <Bar dataKey="totalSales" fill="#8884d8" name="totalSales" />
                  <Bar dataKey="totalTurnover" fill="#82ca9d" name="totalTurnover" />
                  <Bar dataKey="totalMargin" fill="#ffc658" name="totalMargin" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Margin contribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

        {/* Seasonality Analysis */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Seasonality Analysis</CardTitle>
              <CardDescription>Monthly sales trends</CardDescription>
            </div>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tagAnalytics.map((tag) => (
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
                  formatter={(value, name) => [
                    name === "sales" ? value : `$${Number(value).toLocaleString()}`,
                    name === "sales" ? "Sales" : name === "turnover" ? "Turnover" : "Margin",
                  ]}
                />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="turnover" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="margin" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tag Details Table */}
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
                    <th className="text-left p-2">Tag</th>
                    <th className="text-right p-2">Products</th>
                    <th className="text-right p-2">Sales</th>
                    <th className="text-right p-2">Turnover</th>
                    <th className="text-right p-2">Margin</th>
                    <th className="text-right p-2">Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {tagAnalytics.map((tag) => (
                    <tr key={tag.tagId} className="border-b">
                      <td className="p-2">
                        <Badge variant="outline">{tag.tagName}</Badge>
                      </td>
                      <td className="text-right p-2">{tag.productCount}</td>
                      <td className="text-right p-2">{tag.totalSales.toLocaleString()}</td>
                      <td className="text-right p-2">${tag.totalTurnover.toLocaleString()}</td>
                      <td className="text-right p-2">${tag.totalMargin.toLocaleString()}</td>
                      <td className="text-right p-2">${tag.avgPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

