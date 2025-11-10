"use client"

import { useState, useEffect } from "react"
import AppLayout from "@/components/layout/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Tags, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"

interface DashboardStats {
  categories: { total: number; assigned: number; unassigned: number }
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

      // Mock stats
      const mockStats: DashboardStats = {
        categories: {
          total: 8,
          assigned: 6,
          unassigned: 2,
        },
        hasSchema: false,
      }

      setStats(mockStats)
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error)
      // Set default stats on error
      setStats({
        categories: { total: 0, assigned: 0, unassigned: 0 },
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
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
                <CheckCircle className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Tags className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.categories.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.categories.assigned || 0} assigned, {stats?.categories.unassigned || 0} unassigned
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Category Coverage</CardTitle>
              <CardDescription>Product categorization progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Guitars</span>
                    <span className="text-sm text-muted-foreground">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Keyboards</span>
                    <span className="text-sm text-muted-foreground">72%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Drums</span>
                    <span className="text-sm text-muted-foreground">68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Audio Equipment</span>
                    <span className="text-sm text-muted-foreground">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                <a href="/catalog/categories/ai-categorization">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>AI Categorization</span>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                <a href="/catalog/categories/analytics">
                  <BarChart3 className="h-6 w-6 mb-2" />
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

