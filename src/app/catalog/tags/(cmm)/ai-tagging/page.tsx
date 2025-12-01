'use client';

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import AppLayout, { findSectionForPath } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, History, BarChart3, Settings, RefreshCw, Tags } from 'lucide-react';
import { TagJobControlPanel } from '@/components/catalog/ai-tagging/JobControlPanel';
import { TagProgressMonitor } from '@/components/catalog/ai-tagging/ProgressMonitor';
import { TagProductsTable } from '@/components/catalog/ai-tagging/ProductsTable';
import { TagStatisticsPanel } from '@/components/catalog/ai-tagging/StatisticsPanel';
import { ProposedTagsPanel } from '@/components/catalog/ai-tagging/ProposedTagsPanel';
import { buildApiUrl } from '@/lib/utils/api-url';
import { SectionQuickLinks } from '@/components/layout/SectionQuickLinks';
import { usePathname } from 'next/navigation';

interface Job {
  job_id: string;
  job_type: string;
  status: string;
  total_products: number;
  processed_products: number;
  created_at: string;
}

const StatusBadge = memo(({ status }: { status: string }) => {
  switch (status) {
    case 'running':
      return (
        <Badge variant="default" className="bg-blue-500">
          Running
        </Badge>
      );
    case 'queued':
      return <Badge variant="secondary">Queued</Badge>;
    case 'paused':
      return <Badge variant="outline">Paused</Badge>;
    case 'completed':
      return (
        <Badge variant="default" className="bg-green-500">
          Completed
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'cancelled':
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
});
StatusBadge.displayName = 'StatusBadge';

const JobHistoryItem = memo(({ job }: { job: Job }) => {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-mono text-sm">{job.job_id}</span>
          <StatusBadge status={job.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {job.job_type} • {job.processed_products} / {job.total_products} products
        </p>
      </div>
      <div className="text-right">
        <p className="text-muted-foreground text-xs">{new Date(job.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
});
JobHistoryItem.displayName = 'JobHistoryItem';

export default function AITaggingManagementPage() {
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pathname = usePathname() || '';
  const sectionLinks = useMemo(() => findSectionForPath(pathname)?.items ?? [], [pathname]);

  const fetchJobs = useCallback(async () => {
    try {
      const url = buildApiUrl('/api/tag/ai-tagging/jobs?limit=20');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`Failed to fetch jobs: ${response.status} ${response.statusText}`, errorText);
        return;
      }

      const data = await response.json();

      if (data.success) {
        const active = data.jobs.filter((job: Job) =>
          ['queued', 'running', 'paused'].includes(job.status)
        );
        const recent = data.jobs.filter((job: Job) =>
          ['completed', 'failed', 'cancelled'].includes(job.status)
        );

        setActiveJobs(active);
        setRecentJobs(recent.slice(0, 10));
      } else {
        console.error('API returned unsuccessful response:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);

    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleJobStarted = useCallback(() => {
    fetchJobs();
    setRefreshTrigger(prev => prev + 1);
  }, [fetchJobs]);

  const handleJobComplete = useCallback(() => {
    fetchJobs();
    setRefreshTrigger(prev => prev + 1);
  }, [fetchJobs]);

  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    fetchJobs();
  }, [fetchJobs]);

  const activeJobsCount = useMemo(() => activeJobs.length, [activeJobs.length]);

  return (
    <AppLayout
      title="AI Tagging Management"
      breadcrumbs={[{ label: 'Tags', href: '/catalog/tags' }, { label: 'AI Tagging' }]}
      showQuickLinks={false}
    >
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Brain className="text-primary h-8 w-8" />
              AI Tagging Management
            </h1>
            <div className="flex items-center gap-2 sm:gap-3">
              <SectionQuickLinks
                sectionTitle="AI Tagging Management"
                links={sectionLinks}
                activePath={pathname}
                className="hidden md:flex"
              />
              <Button onClick={refreshData} variant="outline" size="sm" className="h-10 px-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            Intelligent product tagging with smart re-tagging logic
          </p>
          {sectionLinks.length > 0 ? (
            <div className="pt-2 md:hidden">
              <SectionQuickLinks
                sectionTitle="AI Tagging Management"
                links={sectionLinks}
                activePath={pathname}
                className="justify-start"
              />
            </div>
          ) : null}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="jobs">
              Jobs
              {activeJobsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeJobsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <TagStatisticsPanel refreshTrigger={refreshTrigger} />

            <TagJobControlPanel onJobStarted={handleJobStarted} />

            {activeJobsCount > 0 && (
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Tags className="h-5 w-5" />
                  Active Jobs
                </h2>
                {activeJobs.map(job => (
                  <TagProgressMonitor
                    key={job.job_id}
                    jobId={job.job_id}
                    onJobComplete={handleJobComplete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            {activeJobsCount > 0 && (
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <BarChart3 className="h-5 w-5" />
                  Active Jobs
                </h2>
                {activeJobs.map(job => (
                  <TagProgressMonitor
                    key={job.job_id}
                    jobId={job.job_id}
                    onJobComplete={handleJobComplete}
                  />
                ))}
              </div>
            )}

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
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
                    <p className="text-muted-foreground py-8 text-center">No recent jobs found</p>
                  ) : (
                    <div className="space-y-3">
                      {recentJobs.map(job => (
                        <JobHistoryItem key={job.job_id} job={job} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <TagProductsTable refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="proposals" className="space-y-6">
            <ProposedTagsPanel />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  AI tagging system settings and provider configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">AI Provider Configuration</h3>
                  <p className="text-muted-foreground text-sm">
                    AI providers are configured in the AI Services admin panel. Go to Admin → AI
                    Services → Product Tags to manage providers, API keys, and model settings.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/admin/ai/config">Go to AI Services Config</a>
                  </Button>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <h3 className="font-medium">Re-tagging Policy</h3>
                  <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                    <li>Products without tags are always tagged (if confidence ≥ threshold)</li>
                    <li>
                      Products with confidence scores are only re-tagged if the new score is higher
                    </li>
                    <li>
                      Products with tags but no confidence are re-tagged if the new confidence ≥
                      threshold
                    </li>
                    <li>Force override bypasses all rules and re-tags everything</li>
                  </ul>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <h3 className="font-medium">Performance Optimization</h3>
                  <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                    <li>Batch processing with configurable batch sizes (50-500 products)</li>
                    <li>Automatic resumability on failure with checkpoint recovery</li>
                    <li>Dynamic batch sizing based on provider token limits</li>
                    <li>Parallel processing where safe with rate limit respect</li>
                  </ul>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <h3 className="font-medium">Database Maintenance</h3>
                  <p className="text-muted-foreground text-sm">
                    Old job progress records are automatically cleaned up after 30 days. Jobs and
                    tagging results are retained indefinitely for audit purposes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
