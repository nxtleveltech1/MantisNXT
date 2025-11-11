"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import NumberTicker from "@/components/magicui/number-ticker"
import { cn } from "@/lib/utils"
import {
  RefreshCw,
  BarChart3,
  CheckCircle,
  FileText,
  Package,
  TrendingUp,
  Clock,
  Activity,
  Upload
} from "lucide-react"

interface ActivityItem {
  id: string
  type: 'merge' | 'upload' | 'update' | 'approval' | 'order'
  title: string
  description: string
  timestamp: Date
  status?: 'success' | 'pending' | 'warning'
  count?: number
}

interface SupplierQuickActionsProps {
  onRefreshData?: () => void
  onViewAnalytics?: () => void
  activities?: ActivityItem[]
  className?: string
}

const defaultActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'merge',
    title: 'Pricelist Merged',
    description: 'BK Percussion pricelist successfully merged',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    status: 'success',
    count: 247
  },
  {
    id: '2',
    type: 'upload',
    title: 'New Upload',
    description: 'Legacy Brands pricelist uploaded',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    status: 'pending'
  },
  {
    id: '3',
    type: 'update',
    title: 'Price Update',
    description: 'BC Electronics - 89 items updated',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    status: 'success',
    count: 89
  },
  {
    id: '4',
    type: 'approval',
    title: 'Approval Required',
    description: 'New supplier needs review',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    status: 'warning'
  }
]

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'merge':
      return CheckCircle
    case 'upload':
      return Upload
    case 'update':
      return RefreshCw
    case 'approval':
      return FileText
    case 'order':
      return Package
    default:
      return Activity
  }
}

const getActivityColor = (status?: ActivityItem['status']) => {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'pending':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'warning':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    default:
      return 'text-blue-600 bg-blue-50 border-blue-200'
  }
}

const formatRelativeTime = (timestamp: Date): string => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

const SupplierQuickActions: React.FC<SupplierQuickActionsProps> = ({
  onRefreshData,
  onViewAnalytics,
  activities = defaultActivities,
  className
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Action Buttons */}
      <Card className="border border-gray-200 shadow-md rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Refresh Data */}
          <button
            onClick={onRefreshData}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm group-hover:shadow-md transition-shadow">
              <RefreshCw className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-700">Refresh Data</span>
          </button>

          {/* View Analytics */}
          <button
            onClick={onViewAnalytics}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all duration-200 group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-sm group-hover:shadow-md transition-shadow">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-700">View Analytics</span>
          </button>
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card className="border border-purple-200 shadow-md rounded-xl bg-gradient-to-br from-white to-purple-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow duration-200"
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg border shrink-0",
                  getActivityColor(activity.status)
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {activity.description}
                      </p>
                    </div>
                    {activity.count && (
                      <Badge variant="secondary" className="shrink-0 bg-purple-100 text-purple-700 border-purple-200">
                        <NumberTicker value={activity.count} className="text-xs font-semibold" />
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                    {activity.status && (
                      <Badge
                        variant="outline"
                        className={cn("text-xs px-1.5 py-0", {
                          "bg-green-50 text-green-700 border-green-200": activity.status === 'success',
                          "bg-yellow-50 text-yellow-700 border-yellow-200": activity.status === 'pending',
                          "bg-orange-50 text-orange-700 border-orange-200": activity.status === 'warning'
                        })}
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card className="border border-green-200 shadow-md rounded-xl bg-gradient-to-br from-white to-green-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Today&rsquo;s Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/50">
            <span className="text-xs text-gray-600">Pricelists Processed</span>
            <div className="flex items-center gap-1">
              <NumberTicker value={247} className="text-lg font-bold text-green-600" />
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/50">
            <span className="text-xs text-gray-600">Items Updated</span>
            <div className="flex items-center gap-1">
              <NumberTicker value={1893} className="text-lg font-bold text-blue-600" />
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/50">
            <span className="text-xs text-gray-600">Active Suppliers</span>
            <div className="flex items-center gap-1">
              <NumberTicker value={42} className="text-lg font-bold text-purple-600" />
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SupplierQuickActions
