"use client"

import { useEffect, useState, useCallback, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, CheckCircle, AlertTriangle, TrendingUp, Activity } from "lucide-react"

interface Stats {
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
  by_provider: Record<string, number>
  last_run_at: string | null
  active_jobs_count: number
}

interface StatisticsPanelProps {
  refreshTrigger?: number
}

export const StatisticsPanel = memo(function StatisticsPanel({ refreshTrigger }: StatisticsPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/category/ai-categorization/stats")
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch stats:", error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats, refreshTrigger])

  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_products.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorized</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.categorized_count.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {Number(stats.categorized_percentage).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending_count.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Need categorization
              {typeof stats.pending_review_count === "number" ? (
                <>
                  {" "}
                  • {stats.pending_review_count.toLocaleString()} awaiting review
                </>
              ) : null}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avg_confidence ? `${(Number(stats.avg_confidence) * 100).toFixed(1)}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">AI confidence score</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
            <CardDescription>Breakdown by confidence levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">High (≥80%)</span>
              </div>
              <span className="font-medium">{stats.confidence_distribution.high.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Medium (60-80%)</span>
              </div>
              <span className="font-medium">{stats.confidence_distribution.medium.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Low (&lt;60%)</span>
              </div>
              <span className="font-medium">{stats.confidence_distribution.low.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider Performance</CardTitle>
            <CardDescription>Categorizations by AI provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.by_provider).length > 0 ? (
              Object.entries(stats.by_provider).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{provider}</span>
                  <span className="font-medium">{count.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active Jobs</span>
            <span className="font-medium">{stats.active_jobs_count}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Failed Categorizations</span>
            <span className="font-medium text-red-600">{stats.failed_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Run</span>
            <span className="font-medium">
              {stats.last_run_at
                ? new Date(stats.last_run_at).toLocaleString()
                : "Never"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

