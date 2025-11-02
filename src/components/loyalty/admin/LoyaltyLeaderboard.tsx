"use client"

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Trophy,
  Medal,
  Award,
  Crown,
  TrendingUp,
  Download,
  Users,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { LoyaltyLeaderboardEntry, LoyaltyTier } from '@/types/loyalty'

const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-blue-400',
  diamond: 'bg-purple-500',
}

const TIER_ICONS: Record<LoyaltyTier, any> = {
  bronze: Award,
  silver: Medal,
  gold: Trophy,
  platinum: Star,
  diamond: Crown,
}

export default function LoyaltyLeaderboard() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month')
  const [tierFilter, setTierFilter] = useState<LoyaltyTier | 'all'>('all')
  const [limit, setLimit] = useState(50)

  // Fetch leaderboard
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['loyalty-leaderboard', period, tierFilter, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        limit: limit.toString(),
        ...(tierFilter !== 'all' && { tier: tierFilter }),
      })

      const res = await fetch(`/api/v1/admin/loyalty/analytics/leaderboard?${params}`)
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      return res.json() as Promise<LoyaltyLeaderboardEntry[]>
    },
  })

  // Export to CSV
  const handleExport = () => {
    if (!leaderboard || leaderboard.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = [
      'Rank',
      'Customer Name',
      'Company',
      'Tier',
      'Total Points',
      'Balance',
      'Lifetime Value',
      'Referrals',
      'Tier Qualified',
    ]

    const rows = leaderboard.map((entry) => [
      entry.overall_rank,
      entry.customer_name,
      entry.company || 'N/A',
      entry.current_tier,
      entry.total_points_earned,
      entry.points_balance,
      entry.lifetime_value,
      entry.referral_count,
      format(new Date(entry.tier_qualified_date), 'yyyy-MM-dd'),
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loyalty-leaderboard-${period}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Leaderboard exported successfully')
  }

  // Stats
  const stats = useMemo(() => {
    if (!leaderboard) return { total: 0, avgPoints: 0, avgValue: 0, topTier: 'bronze' as LoyaltyTier }

    const total = leaderboard.length
    const avgPoints = leaderboard.reduce((sum, e) => sum + e.total_points_earned, 0) / total
    const avgValue = leaderboard.reduce((sum, e) => sum + e.lifetime_value, 0) / total

    const tierCounts = leaderboard.reduce((acc, e) => {
      acc[e.current_tier] = (acc[e.current_tier] || 0) + 1
      return acc
    }, {} as Record<LoyaltyTier, number>)

    const topTier = Object.entries(tierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as LoyaltyTier

    return { total, avgPoints, avgValue, topTier }
  }, [leaderboard])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />
      default:
        return null
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Loyalty Leaderboard</h2>
          <p className="text-muted-foreground">Top performing customers and tier rankings</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Points Earned</p>
                <p className="text-2xl font-bold">{Math.round(stats.avgPoints).toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Lifetime Value</p>
                <p className="text-2xl font-bold">${Math.round(stats.avgValue).toLocaleString()}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Tier</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${TIER_COLORS[stats.topTier]}`} />
                  <p className="text-xl font-bold capitalize">{stats.topTier}</p>
                </div>
              </div>
              {React.createElement(TIER_ICONS[stats.topTier], { className: 'w-8 h-8 text-primary' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="diamond">Diamond</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">Top 25</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                  <SelectItem value="250">Top 250</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No leaderboard data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Total Points</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Lifetime Value</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead>Tier Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => {
                  const TierIcon = TIER_ICONS[entry.current_tier]
                  const rankIcon = getRankIcon(entry.overall_rank)

                  return (
                    <TableRow key={entry.customer_id} className={entry.overall_rank <= 3 ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {rankIcon || (
                            <span className="text-lg font-bold text-muted-foreground">
                              {entry.overall_rank}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="text-xs font-semibold">
                              {getInitials(entry.customer_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{entry.customer_name}</div>
                            {entry.company && (
                              <div className="text-sm text-muted-foreground">{entry.company}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${TIER_COLORS[entry.current_tier]}`} />
                          <span className="capitalize font-medium">{entry.current_tier}</span>
                          <TierIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="font-semibold">{entry.total_points_earned.toLocaleString()}</div>
                        {period === 'month' && entry.points_this_month > 0 && (
                          <div className="text-xs text-green-600">
                            +{entry.points_this_month.toLocaleString()} this month
                          </div>
                        )}
                        {period === 'quarter' && entry.points_this_quarter > 0 && (
                          <div className="text-xs text-green-600">
                            +{entry.points_this_quarter.toLocaleString()} this quarter
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge variant="outline">{entry.points_balance.toLocaleString()}</Badge>
                      </TableCell>

                      <TableCell className="text-right font-semibold">
                        ${entry.lifetime_value.toLocaleString()}
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge variant="secondary">{entry.referral_count}</Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(entry.tier_qualified_date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
