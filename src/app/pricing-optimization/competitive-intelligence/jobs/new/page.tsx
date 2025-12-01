'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, X } from 'lucide-react';
import { useCompetitors, useCreateScrapingJob } from '@/hooks/api/useCompetitiveIntel';
import { useOrgId } from '@/hooks/api/useCompetitiveIntel';

export default function NewScrapingJobPage() {
  const router = useRouter();
  const { data: orgId } = useOrgId();
  const { data: competitors = [], isLoading: competitorsLoading } = useCompetitors(orgId);
  const createJobMutation = useCreateScrapingJob();

  const [formData, setFormData] = useState({
    job_name: '',
    competitor_id: '',
    schedule_type: 'manual' as 'manual' | 'cron' | 'interval',
    cron_expression: '',
    interval_hours: '24',
    priority: '5',
    max_concurrency: '3',
    rate_limit_per_min: '10',
    enabled: true,
    metadata: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      alert('Organization ID not available');
      return;
    }

    try {
      const scheduleConfig: Record<string, unknown> = {};
      if (formData.schedule_type === 'cron') {
        scheduleConfig.cron_expression = formData.cron_expression;
      } else if (formData.schedule_type === 'interval') {
        scheduleConfig.interval_hours = parseInt(formData.interval_hours, 10);
      }

      const metadata: Record<string, unknown> = {};
      if (formData.metadata.trim()) {
        try {
          Object.assign(metadata, JSON.parse(formData.metadata));
        } catch {
          // Invalid JSON, ignore
        }
      }

      await createJobMutation.mutateAsync({
        orgId,
        job_name: formData.job_name,
        competitor_id: formData.competitor_id || undefined,
        schedule_type: formData.schedule_type,
        schedule_config: scheduleConfig,
        status: formData.enabled ? 'active' : 'paused',
        priority: parseInt(formData.priority, 10),
        max_concurrency: parseInt(formData.max_concurrency, 10),
        rate_limit_per_min: parseInt(formData.rate_limit_per_min, 10),
        metadata,
      });

      router.push('/pricing-optimization/competitive-intelligence/jobs');
    } catch (error) {
      console.error('Failed to create job:', error);
      alert(error instanceof Error ? error.message : 'Failed to create scraping job');
    }
  };

  return (
    <AppLayout
      title="Create Scraping Job"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        {
          label: 'Competitive Intelligence',
          href: '/pricing-optimization/competitive-intelligence',
        },
        {
          label: 'Scraping Jobs',
          href: '/pricing-optimization/competitive-intelligence/jobs',
        },
        { label: 'New Job' },
      ]}
    >
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Scraping Job</h1>
          <p className="text-muted-foreground mt-1">
            Configure a new web scraping job for competitive intelligence collection
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Job name and target competitor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="job_name">Job Name *</Label>
                  <Input
                    id="job_name"
                    value={formData.job_name}
                    onChange={e => setFormData({ ...formData, job_name: e.target.value })}
                    placeholder="e.g., Daily Competitor Price Check"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="competitor_id">Competitor (Optional)</Label>
                  <Select
                    value={formData.competitor_id}
                    onValueChange={value => setFormData({ ...formData, competitor_id: value })}
                    disabled={competitorsLoading}
                  >
                    <SelectTrigger id="competitor_id">
                      <SelectValue placeholder="Select competitor (or leave blank for all)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Competitors</SelectItem>
                      {competitors.map(comp => (
                        <SelectItem key={comp.competitor_id} value={comp.competitor_id}>
                          {comp.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
                <CardDescription>Configure when and how often the job runs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="schedule_type">Schedule Type *</Label>
                  <Select
                    value={formData.schedule_type}
                    onValueChange={(value: 'manual' | 'cron' | 'interval') =>
                      setFormData({ ...formData, schedule_type: value })
                    }
                  >
                    <SelectTrigger id="schedule_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual (On-Demand Only)</SelectItem>
                      <SelectItem value="interval">Interval (Every X Hours)</SelectItem>
                      <SelectItem value="cron">Cron Expression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.schedule_type === 'interval' && (
                  <div>
                    <Label htmlFor="interval_hours">Interval (Hours) *</Label>
                    <Input
                      id="interval_hours"
                      type="number"
                      min="1"
                      value={formData.interval_hours}
                      onChange={e => setFormData({ ...formData, interval_hours: e.target.value })}
                      required
                    />
                  </div>
                )}

                {formData.schedule_type === 'cron' && (
                  <div>
                    <Label htmlFor="cron_expression">Cron Expression *</Label>
                    <Input
                      id="cron_expression"
                      value={formData.cron_expression}
                      onChange={e => setFormData({ ...formData, cron_expression: e.target.value })}
                      placeholder="0 0 * * * (daily at midnight)"
                      required
                    />
                    <p className="text-muted-foreground mt-1 text-xs">
                      Format: minute hour day month weekday
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Settings</CardTitle>
                <CardDescription>Control job execution parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority (1-10) *</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      required
                    />
                    <p className="text-muted-foreground mt-1 text-xs">Higher = more important</p>
                  </div>

                  <div>
                    <Label htmlFor="max_concurrency">Max Concurrency *</Label>
                    <Input
                      id="max_concurrency"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.max_concurrency}
                      onChange={e => setFormData({ ...formData, max_concurrency: e.target.value })}
                      required
                    />
                    <p className="text-muted-foreground mt-1 text-xs">Parallel scraping jobs</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="rate_limit_per_min">Rate Limit (requests/min) *</Label>
                  <Input
                    id="rate_limit_per_min"
                    type="number"
                    min="1"
                    value={formData.rate_limit_per_min}
                    onChange={e => setFormData({ ...formData, rate_limit_per_min: e.target.value })}
                    required
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Maximum requests per minute to prevent blocking
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Options */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Options</CardTitle>
                <CardDescription>Additional configuration and metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enabled">Enabled</Label>
                    <p className="text-muted-foreground text-xs">
                      Job will be active immediately after creation
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={checked => setFormData({ ...formData, enabled: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="metadata">Metadata (JSON)</Label>
                  <Textarea
                    id="metadata"
                    value={formData.metadata}
                    onChange={e => setFormData({ ...formData, metadata: e.target.value })}
                    placeholder='{"custom_field": "value"}'
                    rows={4}
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Optional JSON metadata for custom configuration
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={createJobMutation.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={createJobMutation.isPending}>
                {createJobMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Job
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
