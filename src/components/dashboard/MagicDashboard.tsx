"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { BulletproofErrorBoundary } from '@/components/ui/BulletproofErrorBoundary'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  DollarSign,
  Target,
  CalendarIcon
} from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

// Data hooks
import { useDashboardMetrics } from '@/hooks/api/useDashboardMetrics'
import {
  useRealTimeDashboard,
  useRealTimeSuppliers,
  useRealTimeInventory,
} from '@/hooks/useRealTimeDataFixed'

// Utils
import { errorLogger } from '@/lib/utils/dataValidation'

// Chart data generators
const generateRevenueData = () => [
  { month: 'Jan', value: 12500 },
  { month: 'Feb', value: 13200 },
  { month: 'Mar', value: 13800 },
  { month: 'Apr', value: 14100 },
  { month: 'May', value: 14700 },
  { month: 'Jun', value: 15231.89 },
]

const generateSubscriptionData = () => [
  { month: 'Jan', value: 1200 },
  { month: 'Feb', value: 1450 },
  { month: 'Mar', value: 1680 },
  { month: 'Apr', value: 1920 },
  { month: 'May', value: 2100 },
  { month: 'Jun', value: 2350 },
]

const generateExerciseData = () => [
  { day: 'Mon', minutes: 45, goal: 60 },
  { day: 'Tue', minutes: 52, goal: 60 },
  { day: 'Wed', minutes: 38, goal: 60 },
  { day: 'Thu', minutes: 61, goal: 60 },
  { day: 'Fri', minutes: 55, goal: 60 },
  { day: 'Sat', minutes: 67, goal: 60 },
  { day: 'Sun', minutes: 48, goal: 60 },
]

// Revenue Card Component
const RevenueCard = () => {
  const data = generateRevenueData()

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Revenue</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Total revenue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-4xl font-bold tracking-tight">
            ${data[data.length - 1].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 mt-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">+20.1%</span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Subscriptions Card Component
const SubscriptionsCard = () => {
  const data = generateSubscriptionData()

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Subscriptions</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Active subscribers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-4xl font-bold tracking-tight">
            +{data[data.length - 1].value.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">+180.1%</span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="subscriptionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              fill="url(#subscriptionGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Calendar Card Component
const CalendarCard = () => {
  const [date, setDate] = useState<Date | undefined>(new Date(2025, 5, 5))
  const activityData = [12, 8, 15, 22, 18, 9, 14]

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Calendar</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Your schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
            day_range_end: "day-range-end",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
        />
        <div>
          <Button className="w-full" variant="outline">
            <Target className="h-4 w-4 mr-2" />
            Move Goal
          </Button>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Weekly Activity</div>
          <div className="flex items-end gap-1 h-16">
            {activityData.map((value, index) => (
              <div
                key={index}
                className="flex-1 bg-chart-2/20 rounded-sm flex items-end"
              >
                <div
                  className="w-full bg-[hsl(var(--chart-2))] rounded-sm transition-all"
                  style={{ height: `${(value / 22) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Exercise Minutes Card Component
const ExerciseMinutesCard = () => {
  const data = generateExerciseData()

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Exercise Minutes</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Your exercise minutes are ahead of where you normally are
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--chart-3))', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="goal"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Quick Stats Cards
const QuickStatCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon
}: {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down'
  icon: any
}) => {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {change}
              </span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Dashboard Component
const MagicDashboard = () => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Data hooks
  const dashboardQuery = useDashboardMetrics()
  const {
    loading: dashboardLoading,
    error: dashboardError,
  } = useRealTimeDashboard()

  const {
    data: suppliersData,
    isLoading: suppliersLoading,
  } = useRealTimeSuppliers({
    status: ['active', 'preferred'],
    includeMetrics: true
  })

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
  } = useRealTimeInventory({
    includeAlerts: true,
    includeMetrics: true
  })

  // Computed metrics
  const metrics = useMemo(() => {
    const suppliers = suppliersData?.data || []
    const inventory = inventoryData?.data || []
    const invMetrics = inventoryData?.metrics || {}

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(s => s.status === 'active').length,
      totalInventoryValue: invMetrics.totalValue || 0,
      stockAlerts: (invMetrics.lowStockItems || 0) + (invMetrics.outOfStockItems || 0),
    }
  }, [suppliersData, inventoryData])

  const loading = dashboardQuery.isLoading || dashboardLoading || suppliersLoading || inventoryLoading

  if (!mounted || loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse bg-muted">
              <CardContent className="p-6">
                <div className="h-24 bg-muted-foreground/20 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStatCard
          title="Total Revenue"
          value={`$${Math.round(metrics.totalInventoryValue).toLocaleString()}`}
          change="+12.5%"
          trend="up"
          icon={DollarSign}
        />
        <QuickStatCard
          title="Active Users"
          value={metrics.activeSuppliers}
          change="+8.2%"
          trend="up"
          icon={Users}
        />
        <QuickStatCard
          title="Conversion Rate"
          value="3.42%"
          change="+2.1%"
          trend="up"
          icon={Target}
        />
        <QuickStatCard
          title="Active Now"
          value={metrics.totalSuppliers}
          change="-1.2%"
          trend="down"
          icon={Activity}
        />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Revenue and Subscriptions Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RevenueCard />
            <SubscriptionsCard />
          </div>

          {/* Exercise Minutes */}
          <ExerciseMinutesCard />
        </div>

        {/* Right Column - Calendar */}
        <div className="lg:col-span-4">
          <CalendarCard />
        </div>
      </div>
    </div>
  )
}

// Wrapped with Error Boundary
const WrappedMagicDashboard = () => (
  <BulletproofErrorBoundary
    showDetails={process.env.NODE_ENV === 'development'}
    onError={(error, errorInfo) => {
      errorLogger.logError('magic-dashboard', error, 'Dashboard error')
      console.error('🚨 Magic Dashboard Error:', error)
      console.error('Component Stack:', errorInfo.componentStack)
    }}
  >
    <MagicDashboard />
  </BulletproofErrorBoundary>
)

export default WrappedMagicDashboard
