/**
 * Activity Feed Component with Enhanced Error Handling and Performance
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimestamp, getRelativeTime, safeParseDate } from '@/lib/utils/date-utils';
import { Activity, RefreshCw, AlertTriangle, Clock, User, Package, DollarSign } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  status?: string;
  metadata?: {
    category?: string;
    source?: string;
  };
}

interface ActivityFeedProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
  showMetrics?: boolean;
}

interface ActivityResponse {
  success: boolean;
  data: ActivityItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  metrics?: unknown;
  error?: string;
}

const ACTIVITY_ICONS = {
  supplier_added: User,
  inventory_update: Package,
  item_added: Package,
  price_change: DollarSign,
  delivery_received: Package,
  contract_signed: DollarSign,
  default: Activity
};

const PRIORITY_COLORS = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary'
} as const;

export default function ActivityFeed({
  limit = 10,
  autoRefresh = false,
  refreshInterval = 30000,
  className = '',
  showMetrics = false
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  /**
   * Fetch activities with error handling
   */
  const fetchActivities = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/activities/recent?limit=${limit}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache control for refresh
        cache: isRefresh ? 'no-cache' : 'default'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ActivityResponse = await response.json();

      if (result.success && result.data) {
        // Validate and sanitize activity data
        const validActivities = result.data.filter(activity => {
          return activity.id && activity.timestamp && safeParseDate(activity.timestamp);
        });

        setActivities(validActivities);
        setLastUpdate(new Date());
      } else {
        throw new Error(result.error || 'Failed to fetch activities');
      }

    } catch (err) {
      console.error('❌ Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  /**
   * Manual refresh
   */
  const handleRefresh = useCallback(() => {
    fetchActivities(true);
  }, [fetchActivities]);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchActivities(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchActivities]);

  /**
   * Memoized activity rendering for performance
   */
  const renderedActivities = useMemo(() => {
    return activities.map((activity) => {
      const IconComponent = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || ACTIVITY_ICONS.default;
      const priorityColor = PRIORITY_COLORS[activity.priority];

      return (
        <div
          key={activity.id}
          className="flex items-start space-x-4 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
        >
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <IconComponent className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {activity.title}
              </h4>
              <Badge variant={priorityColor} className="text-xs">
                {activity.priority}
              </Badge>
            </div>

            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {activity.description}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3" />
                <span title={formatTimestamp(activity.timestamp)}>
                  {getRelativeTime(activity.timestamp)}
                </span>
              </div>

              {activity.entityType && (
                <Badge variant="outline" className="text-xs">
                  {activity.entityType}
                </Badge>
              )}
            </div>
          </div>
        </div>
      );
    });
  }, [activities]);

  /**
   * Loading skeleton
   */
  if (loading && activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription>Loading system activities...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Error state
   */
  if (error && activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Activity Feed Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="mb-4">
              {error}
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Latest system events and updates
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  • Updated {getRelativeTime(lastUpdate)}
                </span>
              )}
            </CardDescription>
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activities found</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {renderedActivities}
          </div>
        )}

        {error && activities.length > 0 && (
          <div className="p-4 border-t">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Error updating activities: {error}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}