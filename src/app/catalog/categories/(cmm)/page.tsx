"use client"

import { useEffect, useMemo, useState } from "react"
import AppLayout from "@/components/layout/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Tags, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"
import { buildApiUrl } from "@/lib/utils/api-url"

interface CategorizationStats {
  total_products: number
  categorized_count: number
  categorized_percentage: number
  pending_count: number
  pending_review_count?: number
  failed_count: number
  avg_confidence: number | null
  confidence_distribution: {
    high: number
    medium: number
    low: number
  }
  by_status: Record<string, number>
  by_provider: Record<string, number>
  last_run_at: string | null
  active_jobs_count: number
}

interface CategorySummary {
  id: string
  name: string
  parentId: string | null
  path: string
  level?: number
  isActive?: boolean
  productCount?: number
  pendingReviewCount?: number
  hasChildren?: boolean
}

export default function CmmDashboard() {
  const [stats, setStats] = useState<CategorizationStats | null>(null)
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLiveData, setHasLiveData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, categoriesRes] = await Promise.all([
        fetch(buildApiUrl("/api/category/ai-categorization/stats")),
        fetch(buildApiUrl("/api/categories")),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData?.success && statsData.stats) {
          setStats(statsData.stats as CategorizationStats)
          setHasLiveData(true)
        } else {
          setHasLiveData(false)
        }
      } else {
        setHasLiveData(false)
      }

      if (categoriesRes.ok) {
        const categoriesData: CategorySummary[] = await categoriesRes.json()
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      } else {
        setCategories([])
      }
    } catch (err) {
      console.error("Failed to load category dashboard data:", err)
      setError("Unable to load live category metrics. Showing placeholders instead.")
      setHasLiveData(false)
    } finally {
      setLoading(false)
    }
  }

  const derived = useMemo(() => {
    const totalCategories = categories.length
    const activeCategories = categories.filter((c) => c.isActive ?? true).length
    const pendingReviewTotal = categories.reduce(
      (sum, cat) => sum + (cat.pendingReviewCount ?? 0),
      0,
    )
    const totalProducts = stats?.total_products ?? 0
    const uncategorizedProducts = stats ? stats.pending_count : 0
    const categorizedProducts = stats ? stats.categorized_count : 0
    const coverage = stats ? Math.round(stats.categorized_percentage) : 0

    const topCategories = [...categories]
      .filter((category) => (category.productCount ?? 0) > 0)
      .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0))
      .slice(0, 5)

    const maxProductCount = topCategories.length
      ? Math.max(...topCategories.map((category) => category.productCount ?? 0))
      : 0

    return {
      totalCategories,
      activeCategories,
      pendingReviewTotal,
      totalProducts,
      uncategorizedProducts,
      categorizedProducts,
      coverage,
      topCategories,
      maxProductCount,
    }
  }, [categories, stats])

  if (loading) {
    return (
      <AppLayout title="Category Management Dashboard" breadcrumbs={[{ label: "Category Management" }]}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Category Management Dashboard</h1>
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-8 bg-muted rounded w-1/2" />
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Category Management Dashboard</h1>
            <p className="text-muted-foreground">
              Live view of category hierarchy, AI coverage, and outstanding review workloads.
            </p>
            {error && <p className="text-sm text-yellow-600 mt-2">{error}</p>}
          </div>
          <div className="flex items-center gap-2">
            {hasLiveData ? (
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">
                <AlertCircle className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Tags className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derived.totalCategories}</div>
              <p className="text-xs text-muted-foreground">
                {derived.activeCategories} active • {derived.pendingReviewTotal} awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorized Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derived.categorizedProducts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Coverage at {derived.coverage}% ({derived.totalProducts.toLocaleString()} total products)
              </p>
              <Progress value={derived.coverage} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {derived.pendingReviewTotal.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.pending_review_count ?? 0} products flagged by AI for manual approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active AI Jobs</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.active_jobs_count ?? 0}</div>
              <p className="text-xs text-muted-foreground">Queued or running categorization jobs</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <CardDescription>AI categorization workflow at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <StatusRow label="Completed" value={stats?.categorized_count ?? 0} tone="success" />
                <StatusRow
                  label="Pending AI Processing"
                  value={(stats?.pending_count ?? 0) - (stats?.pending_review_count ?? 0)}
                  tone="default"
                />
                <StatusRow
                  label="Pending Manual Review"
                  value={stats?.pending_review_count ?? 0}
                  tone="warning"
                />
                <StatusRow label="Failed" value={stats?.failed_count ?? 0} tone="destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Categories by Product Count</CardTitle>
              <CardDescription>Most populated categories in the current hierarchy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {derived.topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No category coverage data available yet.</p>
              ) : (
                derived.topCategories.map((category) => {
                  const share = derived.maxProductCount
                    ? Math.round(((category.productCount ?? 0) / derived.maxProductCount) * 100)
                    : 0

                  return (
                    <div key={category.id}>
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{category.name}</span>
                        <span className="text-muted-foreground">
                          {(category.productCount ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <Progress value={share} className="mt-2" />
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump straight into category operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                <a href="/catalog/categories/categories">
                  <Tags className="h-6 w-6 mb-2" />
                  <span>Manage Hierarchy</span>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                <a href="/catalog/categories/ai-categorization">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>Run AI Categorization</span>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col bg-transparent">
                <a href="/catalog/categories/analytics">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  <span>Review Analytics</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "success" | "warning" | "destructive" | "default"
}) {
  const toneClass =
    tone === "success"
      ? "text-green-600"
      : tone === "warning"
        ? "text-yellow-600"
        : tone === "destructive"
          ? "text-red-600"
          : "text-muted-foreground"

  return (
    <div className="flex items-center justify-between text-sm">
      <span className={toneClass}>{label}</span>
      <span className="font-medium">{value.toLocaleString()}</span>
    </div>
  )
}
