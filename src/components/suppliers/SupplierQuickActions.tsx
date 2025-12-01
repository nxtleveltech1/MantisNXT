'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import NumberTicker from '@/components/magicui/number-ticker';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  BarChart3,
  CheckCircle,
  FileText,
  Package,
  TrendingUp,
  Clock,
  Activity,
  Upload,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'merge' | 'upload' | 'update' | 'approval' | 'order';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'pending' | 'warning';
  count?: number;
}

interface SupplierQuickActionsProps {
  onRefreshData?: () => void;
  onViewAnalytics?: () => void;
  onUploadPricelist?: () => void;
  activities?: ActivityItem[];
  className?: string;
}

const defaultActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'merge',
    title: 'Pricelist Merged',
    description: 'BK Percussion pricelist successfully merged',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    status: 'success',
    count: 247,
  },
  {
    id: '2',
    type: 'upload',
    title: 'New Upload',
    description: 'Legacy Brands pricelist uploaded',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    status: 'pending',
  },
  {
    id: '3',
    type: 'update',
    title: 'Price Update',
    description: 'BC Electronics - 89 items updated',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    status: 'success',
    count: 89,
  },
  {
    id: '4',
    type: 'approval',
    title: 'Approval Required',
    description: 'New supplier needs review',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    status: 'warning',
  },
];

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'merge':
      return CheckCircle;
    case 'upload':
      return Upload;
    case 'update':
      return RefreshCw;
    case 'approval':
      return FileText;
    case 'order':
      return Package;
    default:
      return Activity;
  }
};

const getActivityColor = (status?: ActivityItem['status']) => {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'warning':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

const formatRelativeTime = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const SupplierQuickActions: React.FC<SupplierQuickActionsProps> = ({
  onRefreshData,
  onViewAnalytics,
  onUploadPricelist,
  activities = defaultActivities,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Action Buttons */}
      <Card className="rounded-xl border border-gray-200 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-purple-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Refresh Data */}
          <button
            onClick={onRefreshData}
            className="group flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 transition-all duration-200 hover:from-green-100 hover:to-emerald-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm transition-shadow group-hover:shadow-md">
              <RefreshCw className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-700">Refresh Data</span>
          </button>

          {/* Upload Pricelist */}
          <button
            onClick={onUploadPricelist}
            className="group flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 transition-all duration-200 hover:from-blue-100 hover:to-indigo-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm transition-shadow group-hover:shadow-md">
              <Upload className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-700">Upload Pricelist</span>
          </button>

          {/* View Analytics */}
          <button
            onClick={onViewAnalytics}
            className="group flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-3 transition-all duration-200 hover:from-purple-100 hover:to-pink-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-sm transition-shadow group-hover:shadow-md">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-700">View Analytics</span>
          </button>
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card className="rounded-xl border border-purple-200 bg-gradient-to-br from-white to-purple-50/30 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-purple-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activities.map(activity => {
            const Icon = getActivityIcon(activity.type);
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg border bg-white p-3 transition-shadow duration-200 hover:shadow-sm"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    getActivityColor(activity.status)
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="truncate text-xs text-gray-500">{activity.description}</p>
                    </div>
                    {activity.count && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 border-purple-200 bg-purple-100 text-purple-700"
                      >
                        <NumberTicker value={activity.count} className="text-xs font-semibold" />
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                    {activity.status && (
                      <Badge
                        variant="outline"
                        className={cn('px-1.5 py-0 text-xs', {
                          'border-green-200 bg-green-50 text-green-700':
                            activity.status === 'success',
                          'border-yellow-200 bg-yellow-50 text-yellow-700':
                            activity.status === 'pending',
                          'border-orange-200 bg-orange-50 text-orange-700':
                            activity.status === 'warning',
                        })}
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card className="rounded-xl border border-green-200 bg-gradient-to-br from-white to-green-50/30 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Today&rsquo;s Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-white/50 p-2">
            <span className="text-xs text-gray-600">Pricelists Processed</span>
            <div className="flex items-center gap-1">
              <NumberTicker value={247} className="text-lg font-bold text-green-600" />
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/50 p-2">
            <span className="text-xs text-gray-600">Items Updated</span>
            <div className="flex items-center gap-1">
              <NumberTicker value={1893} className="text-lg font-bold text-blue-600" />
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/50 p-2">
            <span className="text-xs text-gray-600">Active Suppliers</span>
            <div className="flex items-center gap-1">
              <NumberTicker value={42} className="text-lg font-bold text-purple-600" />
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierQuickActions;
