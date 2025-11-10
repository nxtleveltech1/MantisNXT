"use client"

import { useEffect, useState } from "react"
import AppLayout from "@/components/layout/AppLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, History, BarChart3, Settings, RefreshCw } from "lucide-react"
import { JobControlPanel } from "@/components/catalog/ai-categorization/JobControlPanel"
import { ProgressMonitor } from "@/components/catalog/ai-categorization/ProgressMonitor"
import { ProductsTable } from "@/components/catalog/ai-categorization/ProductsTable"
import { StatisticsPanel } from "@/components/catalog/ai-categorization/StatisticsPanel"
import { ProposedCategoriesPanel } from "@/components/catalog/ai-categorization/ProposedCategoriesPanel"

interface Job {
  job_id: string
  job_type: string
  status: string
  total_products: number
  processed_products: number
  created_at: string
}

export default function AICategoryManagementPage() {
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000)

    return () => clearInterval(interval)
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/category/ai-categorization/jobs?limit=20")
      const data = await response.json()

      if (data.success) {
        const active = data.jobs.filter((job: Job) =>
          ["queued", "running", "paused"].includes(job.status)
        )
        const recent = data.jobs.filter((job: Job) =>
          ["completed", "failed", "cancelled"].includes(job.status)
        )

        setActiveJobs(active)
        setRecentJobs(recent.slice(0, 10))
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error)
    }
  }

  const handleJobStarted = () => {
    fetchJobs()
    setRefreshTrigger(prev => prev + 1)
  }

  const handleJobComplete = () => {
    fetchJobs()
    setRefreshTrigger(prev => prev + 1)
  }

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1)
    fetchJobs()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge variant="default" className="bg-blue-500">Running</Badge>
      case "queued":
        return <Badge variant="secondary">Queued</Badge>
      case "paused":
        return <Badge variant="outline">Paused</Badge>
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <AppLayout
      title="AI Category Management"
      breadcrumbs={[
        { label: "Category Management", href: "/catalog/categories" },
        { label: "AI Category Management" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              AI Category Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Intelligent product categorization with smart re-categorization
            </p>
          </div>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="jobs">
              Jobs
              {activeJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeJobs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <StatisticsPanel refreshTrigger={refreshTrigger} />

            <JobControlPanel onJobStarted={handleJobStarted} />

            {activeJobs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Active Jobs</h2>
                {activeJobs.map(job => (
                  <ProgressMonitor
                    key={job.job_id}
                    jobId={job.job_id}
                    onJobComplete={handleJobComplete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            {activeJobs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Active Jobs
                </h2>
                {activeJobs.map(job => (
                  <ProgressMonitor
                    key={job.job_id}
                    jobId={job.job_id}
                    onJobComplete={handleJobComplete}
                  />
                ))}
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Jobs
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>Job History</CardTitle>
                  <CardDescription>Recently completed, failed, or cancelled jobs</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentJobs.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No recent jobs found
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentJobs.map(job => (
                        <div
                          key={job.job_id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm">{job.job_id}</span>
                              {getStatusBadge(job.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {job.job_type} • {job.processed_products} / {job.total_products} products
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(job.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductsTable refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="proposals" className="space-y-6">
            <ProposedCategoriesPanel />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  AI categorization system settings and provider configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">AI Provider Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    AI providers are configured in the AI Services admin panel. Go to Admin → AI
                    Services → Product Categories to manage providers, API keys, and model
                    settings.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/admin/ai/config">Go to AI Services Config</a>
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-medium">Re-categorization Policy</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Products without categories are always categorized (if confidence ≥ threshold)</li>
                    <li>Products with AI confidence scores are only re-categorized if new confidence is higher</li>
                    <li>Products with categories but no confidence are re-categorized if new confidence ≥ threshold</li>
                    <li>Force override bypasses all rules and re-categorizes everything</li>
                  </ul>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-medium">Performance Optimization</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Batch processing with configurable batch sizes (50-500 products)</li>
                    <li>Automatic resumability on failure with checkpoint recovery</li>
                    <li>Dynamic batch sizing based on provider token limits</li>
                    <li>Parallel processing where safe with rate limit respect</li>
                  </ul>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-medium">Database Maintenance</h3>
                  <p className="text-sm text-muted-foreground">
                    Old job progress records are automatically cleaned up after 30 days. Jobs and
                    categorization results are retained indefinitely for audit purposes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}


