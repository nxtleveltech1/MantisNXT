'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

// Mock data structure - will be replaced with actual API calls
interface ScrapingJob {
  job_id: string;
  job_name: string;
  competitor_id?: string;
  competitor_name?: string;
  schedule_type: 'manual' | 'cron' | 'interval';
  status: 'active' | 'paused' | 'archived';
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
}

export default function ScrapingJobsPage() {
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    // TODO: Fetch jobs from API
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/v1/pricing-intel/jobs');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  return (
    <AppLayout
      title="Scraping Jobs"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        {
          label: 'Competitive Intelligence',
          href: '/pricing-optimization/competitive-intelligence',
        },
        { label: 'Scraping Jobs' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scraping Jobs</h1>
            <p className="text-muted-foreground mt-1">
              Schedule and monitor web scraping jobs for competitive intelligence
            </p>
          </div>
          <Button asChild>
            <Link href="/pricing-optimization/competitive-intelligence/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Jobs</CardTitle>
            <CardDescription>Manage scheduled and on-demand scraping jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : jobs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map(job => (
                    <TableRow key={job.job_id}>
                      <TableCell className="font-medium">{job.job_name}</TableCell>
                      <TableCell>
                        {job.competitor_name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{job.schedule_type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {job.last_run_at ? (
                            <>
                              <Clock className="text-muted-foreground h-3 w-3" />
                              <span className="text-sm">{formatDate(job.last_run_at)}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.next_run_at ? (
                          <span className="text-sm">{formatDate(job.next_run_at)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/pricing-optimization/competitive-intelligence/jobs/${job.job_id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement pause/resume
                            }}
                          >
                            {job.status === 'active' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement delete
                            }}
                          >
                            <Trash2 className="text-destructive h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="mb-2 text-lg font-medium">No scraping jobs yet</p>
                <p className="text-muted-foreground mb-4 text-sm">
                  Create a scraping job to start collecting competitive intelligence data
                </p>
                <Button asChild>
                  <Link href="/pricing-optimization/competitive-intelligence/jobs/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Job
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
