"use client"

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Gift,
  Award,
  Download,
  Percent,
  ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { LoyaltyProgramMetrics, LoyaltyTier } from '@/types/loyalty'

const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: '#d97706',
  silver: '#9ca3af',
  gold: '#eab308',
  platinum: '#60a5fa',
  diamond: '#a855f7',
}

interface DateRange {
  from: Date
  to: Date
}

export default function LoyaltyAnalytics() {
  const [programId, setProgramId] = useState<string>('')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'month'>('30d')

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['loyalty-programs'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/loyalty/programs')
      if (!res.ok) throw new Error('Failed to fetch programs')
      return res.json()
    },
  })

  // Set default program
  React.useEffect(() => {
    if (programs && programs.length > 0 && !programId) {
      const defaultProgram = programs.find((p: unknown) => p.is_default) || programs[0]
      setProgramId(defaultProgram.id)
    }
  }, [programs, programId])

  // Fetch metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['loyalty-metrics', programId, dateRange],
    queryFn: async () => {
      if (!programId) return null
      const res = await fetch(`/api/v1/admin/loyalty/analytics/metrics/${programId}`)
      if (!res.ok) throw new Error('Failed to fetch metrics')
      return res.json() as Promise<LoyaltyProgramMetrics>
    },
    enabled: !!programId,
  })

  // Fetch points flow data
  const { data: pointsFlow } = useQuery({
    queryKey: ['loyalty-points-flow', programId, dateRange],
    queryFn: async () => {
      if (!programId) return []
      const res = await fetch(
        `/api/v1/admin/loyalty/analytics/points-flow/${programId}?range=${dateRange}`
      )
      if (!res.ok) throw new Error('Failed to fetch points flow')
      return res.json()
    },
    enabled: !!programId,
  })

  // Fetch tier distribution
  const { data: tierDistribution } = useQuery({
    queryKey: ['loyalty-tier-distribution', programId],
    queryFn: async () => {
      if (!programId) return []
      const res = await fetch(`/api/v1/admin/loyalty/analytics/tier-distribution/${programId}`)
      if (!res.ok) throw new Error('Failed to fetch tier distribution')
      return res.json()
    },
    enabled: !!programId,
  })

  // Export report
  const handleExport = () => {
    if (!metrics) {
      toast.error('No data to export')
      return
    }

    const report = {
      program: metrics.program_name,
      generated_at: new Date().toISOString(),
      summary: {
        total_members: metrics.total_members,
        active_members: metrics.active_members,
        total_points_issued: metrics.total_points_issued,
        total_points_redeemed: metrics.total_points_redeemed,
        redemption_rate: metrics.redemption_rate,
      },
      tier_distribution: metrics.tier_distribution,
      top_rewards: metrics.top_rewards,
      recent_activity: metrics.recent_activity,
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loyalty-analytics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Analytics report exported successfully')
  }

  // Prepare tier distribution chart data
  const tierChartData = React.useMemo(() => {
    if (!metrics?.tier_distribution) return []
    return Object.entries(metrics.tier_distribution).map(([tier, count]) => ({
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      value: count,
      color: TIER_COLORS[tier as LoyaltyTier],
    }))
  }, [metrics])

  // Prepare rewards chart data
  const rewardsChartData = React.useMemo(() => {
    if (!metrics?.top_rewards) return []
    return metrics.top_rewards.slice(0, 10).map((reward) => ({
      name: reward.reward_name.length > 20 ? reward.reward_name.slice(0, 20) + '...' : reward.reward_name,
      redemptions: reward.redemption_count,
    }))
  }, [metrics])

  // Calculate change percentage
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Loyalty Analytics</h2>
          <p className="text-muted-foreground">Program insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {programs?.map((program: unknown) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={dateRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange('7d')}
            >
              Last 7 Days
            </Button>
            <Button
              variant={dateRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange('30d')}
            >
              Last 30 Days
            </Button>
            <Button
              variant={dateRange === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange('90d')}
            >
              Last 90 Days
            </Button>
            <Button
              variant={dateRange === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange('month')}
            >
              This Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{metrics.total_members.toLocaleString()}</p>
                <div className="flex items-center text-xs text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{metrics.active_members}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.active_members} active members
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Points Issued</p>
                <Gift className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{metrics.total_points_issued.toLocaleString()}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.recent_activity.transactions_this_month.toLocaleString()} this month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Points Redeemed</p>
                <Award className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{metrics.total_points_redeemed.toLocaleString()}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.recent_activity.redemptions_this_month.toLocaleString()} this month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Redemption Rate</p>
                <Percent className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{metrics.redemption_rate.toFixed(1)}%</p>
                {metrics.redemption_rate > 50 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.total_points_outstanding.toLocaleString()} outstanding
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Points Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Points Flow Over Time</CardTitle>
          <CardDescription>Points issued and redeemed over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {pointsFlow && pointsFlow.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pointsFlow}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="points_issued"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Points Issued"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="points_redeemed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Points Redeemed"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No points flow data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
            <CardDescription>Customer distribution across loyalty tiers</CardDescription>
          </CardHeader>
          <CardContent>
            {tierChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tierChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tierChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No tier data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Rewards */}
        <Card>
          <CardHeader>
            <CardTitle>Top Rewards</CardTitle>
            <CardDescription>Most redeemed rewards</CardDescription>
          </CardHeader>
          <CardContent>
            {rewardsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rewardsChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" width={150} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="redemptions" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No rewards data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Transaction and redemption activity breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Today</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Transactions:</span>
                  <Badge variant="outline">{metrics.recent_activity.transactions_today}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Redemptions:</span>
                  <Badge variant="outline">{metrics.recent_activity.redemptions_today}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">This Week</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Transactions:</span>
                  <Badge variant="outline">{metrics.recent_activity.transactions_this_week}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Redemptions:</span>
                  <Badge variant="outline">{metrics.recent_activity.redemptions_this_week}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">This Month</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Transactions:</span>
                  <Badge variant="outline">{metrics.recent_activity.transactions_this_month}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Redemptions:</span>
                  <Badge variant="outline">{metrics.recent_activity.redemptions_this_month}</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Program Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b">
              <dt className="text-muted-foreground">Average Points per Customer:</dt>
              <dd className="font-medium">{Math.round(metrics.avg_points_per_customer).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-muted-foreground">Average Lifetime Value:</dt>
              <dd className="font-medium">${Math.round(metrics.avg_lifetime_value).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-muted-foreground">Points Expired:</dt>
              <dd className="font-medium">{metrics.total_points_expired.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between py-2 border-b">
              <dt className="text-muted-foreground">Points Outstanding:</dt>
              <dd className="font-medium">{metrics.total_points_outstanding.toLocaleString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
