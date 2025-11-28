'use client'

import React, { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, Database, Trash2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface RetentionPolicy {
  retention_days_snapshots: number
  retention_days_alerts: number
  retention_days_jobs: number
  archival_strategy: 'delete' | 'archive' | 'compress'
  last_archive_run_at?: string
}

export default function DataRetentionPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [policy, setPolicy] = useState<RetentionPolicy>({
    retention_days_snapshots: 365,
    retention_days_alerts: 180,
    retention_days_jobs: 90,
    archival_strategy: 'delete',
  })

  useEffect(() => {
    fetchPolicy()
  }, [])

  const fetchPolicy = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/pricing-intel/data-retention')
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message)
      }

      if (data.data) {
        setPolicy(data.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load retention policy',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/v1/pricing-intel/data-retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message)
      }

      toast({
        title: 'Success',
        description: 'Data retention policy updated successfully',
      })

      setPolicy(data.data)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save retention policy',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExecute = async () => {
    if (!confirm('This will permanently delete or archive data according to the retention policy. Continue?')) {
      return
    }

    setExecuting(true)
    try {
      const response = await fetch('/api/v1/pricing-intel/data-retention', {
        method: 'PUT',
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message)
      }

      toast({
        title: 'Success',
        description: `Retention policy executed: ${data.data.snapshotsDeleted} snapshots, ${data.data.alertsDeleted} alerts, ${data.data.jobsArchived} jobs processed`,
      })

      await fetchPolicy()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to execute retention policy',
        variant: 'destructive',
      })
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout
        title="Data Retention Policy"
        breadcrumbs={[
          { label: 'Pricing Optimization', href: '/pricing-optimization' },
          {
            label: 'Competitive Intelligence',
            href: '/pricing-optimization/competitive-intelligence',
          },
          { label: 'Settings', href: '/pricing-optimization/competitive-intelligence/settings' },
          { label: 'Data Retention' },
        ]}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Data Retention Policy"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        {
          label: 'Competitive Intelligence',
          href: '/pricing-optimization/competitive-intelligence',
        },
        { label: 'Settings', href: '/pricing-optimization/competitive-intelligence/settings' },
        { label: 'Data Retention' },
      ]}
    >
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Retention Policy</h1>
          <p className="text-muted-foreground mt-1">
            Configure data retention and archival policies for competitive intelligence data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Retention Periods
            </CardTitle>
            <CardDescription>
              Set how long to retain different types of competitive intelligence data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="snapshots">Snapshots Retention (days)</Label>
                <Input
                  id="snapshots"
                  type="number"
                  min="30"
                  max="3650"
                  value={policy.retention_days_snapshots}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      retention_days_snapshots: parseInt(e.target.value, 10) || 365,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Keep market intelligence snapshots for {policy.retention_days_snapshots} days
                  ({(policy.retention_days_snapshots / 365).toFixed(1)} years)
                </p>
              </div>

              <div>
                <Label htmlFor="alerts">Alerts Retention (days)</Label>
                <Input
                  id="alerts"
                  type="number"
                  min="30"
                  max="3650"
                  value={policy.retention_days_alerts}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      retention_days_alerts: parseInt(e.target.value, 10) || 180,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Keep competitive alerts for {policy.retention_days_alerts} days
                  ({(policy.retention_days_alerts / 365).toFixed(1)} years)
                </p>
              </div>

              <div>
                <Label htmlFor="jobs">Jobs Retention (days)</Label>
                <Input
                  id="jobs"
                  type="number"
                  min="30"
                  max="3650"
                  value={policy.retention_days_jobs}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      retention_days_jobs: parseInt(e.target.value, 10) || 90,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Keep scraping job records for {policy.retention_days_jobs} days
                  ({(policy.retention_days_jobs / 365).toFixed(1)} years)
                </p>
              </div>

              <div>
                <Label htmlFor="strategy">Archival Strategy</Label>
                <Select
                  value={policy.archival_strategy}
                  onValueChange={(value: 'delete' | 'archive' | 'compress') =>
                    setPolicy({ ...policy, archival_strategy: value })
                  }
                >
                  <SelectTrigger id="strategy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delete">Delete Permanently</SelectItem>
                    <SelectItem value="archive">Archive to Storage</SelectItem>
                    <SelectItem value="compress">Compress & Store</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {policy.archival_strategy === 'delete' &&
                    'Data will be permanently deleted after retention period'}
                  {policy.archival_strategy === 'archive' &&
                    'Data will be moved to archive storage'}
                  {policy.archival_strategy === 'compress' &&
                    'Data will be compressed and stored'}
                </p>
              </div>
            </div>

            {policy.last_archive_run_at && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Last archive run: {new Date(policy.last_archive_run_at).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleExecute}
                disabled={executing}
                className="text-destructive hover:text-destructive"
              >
                {executing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Execute Retention Policy Now
                  </>
                )}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Policy
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Important: Data Retention
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Executing the retention policy will permanently delete or archive data older than
                  the specified retention periods. This action cannot be undone. It is recommended
                  to test with shorter retention periods first and ensure you have backups if needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

