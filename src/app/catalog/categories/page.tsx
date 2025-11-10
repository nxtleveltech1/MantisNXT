"use client"

import { useEffect, useState } from "react"
import AppLayout from "@/components/layout/AppLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, BarChart3, CheckCircle, Tags, TrendingUp } from "lucide-react"

interface DashboardStats {
  categories: {
    total: number
    assigned: number
    unassigned: number
    visible: number
    hidden: number
    parents: number
    children: number
  }
  products: {
    total: number
    categorized: number
    uncategorized: number
  }
  topCategories: Array<{
    id: string
    name: string
    productCount: number
    percentage: number
  }>
  recentCategories: Array<{
    id: string
    name: string
    productCount: number
    createdAt: string
  }>
  hasSchema: boolean
}

export default function CategoryManagementPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/categories/dashboard")
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats")
      }

      const data = (await response.json()) as DashboardStats
      setStats(data)
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error)
      setStats({
        categories: {
          total: 0,
          assigned: 0,
          unassigned: 0,
          visible: 0,
          hidden: 0,
          parents: 0,
          children: 0,
        },
        products: {
          total: 0,
          categorized: 0,
          uncategorized: 0,
        },
        topCategories: [],
        recentCategories: [],
        hasSchema: false,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="Category Management Dashboard" breadcrumbs={[{ label: "Category Management" }]}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Category Management Dashboard</h1>
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                    <div className="h-8 w-1/2 rounded bg-gray-200" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Category Management Dashboard" breadcrumbs={[{ label: "Category Management" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Category Management Dashboard</h1>
            <p className="text-muted-foreground">Overview of your product catalog and operations</p>
          </div>
          <div className="flex items-center gap-2">
            {stats?.hasSchema ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="mr-1 h-3 w-3" />
                Live Data
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                <AlertCircle className="mr-1 h-3 w-3" />
                Demo Mode
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
              <Tags className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.categories.total ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.categories.parents ?? 0} parents, {stats?.categories.children ?? 0} children
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.products.total ?? 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.products.categorized ?? 0} categorized</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visible Categories</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.categories.visible ?? 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.categories.hidden ?? 0} hidden</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uncategorized</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.products.uncategorized ?? 0}</div>
              <p className="text-xs text-muted-foreground">products need categories</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Categories by Products</CardTitle>
              <CardDescription>Categories with the most products</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.topCategories && stats.topCategories.length > 0 ? (
                <div className="space-y-4">
                  {stats.topCategories.map((cat) => (
                    <div key={cat.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">{cat.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {cat.productCount} products ({cat.percentage}%)
                        </span>
                      </div>
                      <Progress value={cat.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No category data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recently Added Categories</CardTitle>
              <CardDescription>Latest categories in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentCategories && stats.recentCategories.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <div className="text-sm font-medium">{cat.name}</div>
                        <div className="text-xs text-muted-foreground">{cat.productCount} products</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(cat.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent categories</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button asChild variant="outline" className="flex-col bg-transparent p-4">
                <a href="/catalog/categories/ai-categorization">
                  <TrendingUp className="mb-2 h-6 w-6" />
                  <span>AI Categorization</span>
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-col bg-transparent p-4">
                <a href="/catalog/categories/analytics">
                  <BarChart3 className="mb-2 h-6 w-6" />
                  <span>View Analytics</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

