"use client"

import { useCallback, useEffect, useState, memo, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Pause, Play, X, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { buildApiUrl } from "@/lib/utils/api-url"

interface Job {
  job_id: string
  job_type: string
  status: string
  total_products: number
  processed_products: number
  successful_categorizations: number
  failed_categorizations: number
  created_at: string
  started_at: string | null
}

interface JobStatus {
  job: Job
  progress_percentage: number
  eta_seconds: number | null
  current_batch_number: number
  batches_completed: number
  batches_remaining: number
  recent_errors: string[]
  performance_metrics: {
    avg_products_per_second: number
    avg_tokens_per_product: number
    success_rate: number
  }
}

interface ProgressMonitorProps {
  jobId: string
  onJobComplete?: () => void
}

export const ProgressMonitor = memo(function ProgressMonitor({ jobId, onJobComplete }: ProgressMonitorProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchJobStatus = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/category/ai-categorization/status/${jobId}`))
      const data = await response.json()

      if (data.success) {
        setJobStatus(data.job)

        // Check if job completed
        if (data.job.job.status === "completed" && onJobComplete) {
          onJobComplete()
        }
      }
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch job status:", error)
      setLoading(false)
    }
  }, [jobId, onJobComplete])

  useEffect(() => {
    fetchJobStatus()
    const interval = setInterval(fetchJobStatus, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [fetchJobStatus])

  const pauseJob = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/category/ai-categorization/pause/${jobId}`), {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Job paused")
        fetchJobStatus()
      } else {
        toast.error(data.message || "Failed to pause job")
      }
    } catch (error) {
      toast.error("Failed to pause job")
    }
  }, [jobId, fetchJobStatus])

  const resumeJob = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/category/ai-categorization/resume/${jobId}`), {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Job resumed")
        fetchJobStatus()
      } else {
        toast.error(data.message || "Failed to resume job")
      }
    } catch (error) {
      toast.error("Failed to resume job")
    }
  }, [jobId, fetchJobStatus])

  const cancelJob = useCallback(async () => {
    if (!confirm("Are you sure you want to cancel this job?")) return

    try {
      const response = await fetch(buildApiUrl(`/api/category/ai-categorization/cancel/${jobId}`), {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Job cancelled")
        fetchJobStatus()
      } else {
        toast.error(data.message || "Failed to cancel job")
      }
    } catch (error) {
      toast.error("Failed to cancel job")
    }
  }, [jobId, fetchJobStatus])

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "running":
        return <Badge variant="default" className="bg-blue-500">Running</Badge>
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case "paused":
        return <Badge variant="secondary">Paused</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }, [])

  const formatETA = useCallback((seconds: number | null) => {
    if (!seconds) return "Calculating..."
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
  }, [])

  // Move useMemo hooks before early return to maintain hook order
  const progress = useMemo(() => {
    if (!jobStatus) return 0
    return Number(jobStatus.progress_percentage ?? 0)
  }, [jobStatus?.progress_percentage])

  const eta = useMemo(() => {
    if (!jobStatus) return null
    return jobStatus.eta_seconds ? Number(jobStatus.eta_seconds) : null
  }, [jobStatus?.eta_seconds])

  if (loading || !jobStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading job status...</p>
        </CardContent>
      </Card>
    )
  }

  const job = jobStatus.job

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Job Progress
              {getStatusBadge(job.status)}
            </CardTitle>
            <CardDescription>Job ID: {job.job_id}</CardDescription>
          </div>
          <div className="flex gap-2">
            {job.status === "running" && (
              <>
                <Button size="sm" variant="outline" onClick={pauseJob}>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
                <Button size="sm" variant="destructive" onClick={cancelJob}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}
            {job.status === "paused" && (
              <Button size="sm" onClick={resumeJob}>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress: {progress.toFixed(1)}%</span>
            <span>
              {job.processed_products} / {job.total_products} products
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{job.successful_categorizations}</p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{job.failed_categorizations}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{formatETA(eta)}</p>
              <p className="text-xs text-muted-foreground">ETA</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">
                {Number(jobStatus.performance_metrics.success_rate).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </div>

        {/* Batch Info */}
        <div className="text-sm text-muted-foreground">
          <p>
            Batch {jobStatus.current_batch_number} of{" "}
            {jobStatus.batches_completed + jobStatus.batches_remaining}
          </p>
          <p>
            Speed: {Number(jobStatus.performance_metrics.avg_products_per_second).toFixed(2)} products/sec
          </p>
        </div>

        {/* Recent Errors */}
        {jobStatus.recent_errors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">Recent Errors:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {jobStatus.recent_errors.slice(0, 3).map((error, i) => (
                <li key={i} className="truncate">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

