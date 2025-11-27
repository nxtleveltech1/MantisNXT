"use client"

import { useEffect, useState, useCallback, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, CheckCircle, AlertTriangle, TrendingUp, Activity, Tag } from "lucide-react"
import { buildApiUrl } from "@/lib/utils/api-url"
import { cn } from "@/lib/utils"

interface TaggingStats {
  total_products: number
  tagged_count: number
  tagged_percentage: number
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

export const TagStatisticsPanel = memo(function TagStatisticsPanel({ refreshTrigger }: StatisticsPanelProps) {
  const [stats, setStats] = useState<TaggingStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl("/api/tag/ai-tagging/stats"))
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      } else if (data.error === 'SCHEMA_MISSING_COLUMNS') {
        console.error("Database schema incomplete:", data.missing_columns)
        // Show error in UI - stats will remain null, showing loading state
        alert(`Database schema incomplete. Missing columns: ${data.missing_columns?.join(', ')}. Please run migration 0035_ai_tagging_tracking.sql`)
      }
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch tagging stats:", error)
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_products.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Being monitored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tagged Products</CardTitle>
            <Tag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.tagged_count.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {Number(stats.tagged_percentage).toFixed(1)}% of total
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
              Awaiting tagging
              {typeof stats.pending_review_count === "number" ? (
                <> • {stats.pending_review_count.toLocaleString()} pending review</>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
            <CardDescription>Breakdown by confidence levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DistributionRow label="High (≥80%)" value={stats.confidence_distribution.high} color="bg-green-500" />
            <DistributionRow label="Medium (60-80%)" value={stats.confidence_distribution.medium} color="bg-yellow-500" />
            <DistributionRow label="Low (&lt;60%)" value={stats.confidence_distribution.low} color="bg-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider Performance</CardTitle>
            <CardDescription>Tag assignments by provider</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <SystemRow label="Active Jobs" value={stats.active_jobs_count.toString()} />
          <SystemRow label="Failed Taggings" value={stats.failed_count.toLocaleString()} valueClass="text-red-600" />
          <SystemRow
            label="Last Run"
            value={stats.last_run_at ? new Date(stats.last_run_at).toLocaleString() : "Never"}
          />
        </CardContent>
      </Card>
    </div>
  )
})

function DistributionRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-medium">{value.toLocaleString()}</span>
    </div>
  )
}

function SystemRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", valueClass)}>{value}</span>
    </div>
  )
}


