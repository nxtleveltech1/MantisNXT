import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminDashboardStats } from '@/app/api/admin/dashboard/stats/route';
import type { ActivityEvent } from '@/app/api/admin/dashboard/activity/route';
import type { SystemStatus } from '@/app/api/admin/dashboard/status/route';

// Fetch functions
async function fetchStats(): Promise<AdminDashboardStats> {
  const response = await fetch('/api/admin/dashboard/stats');
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch stats');
  }
  
  return data.data;
}

async function fetchActivity(limit: number = 10): Promise<ActivityEvent[]> {
  const response = await fetch(`/api/admin/dashboard/activity?limit=${limit}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch activity');
  }
  
  return data.data;
}

async function fetchStatus(): Promise<SystemStatus> {
  const response = await fetch('/api/admin/dashboard/status');
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch status');
  }
  
  return data.data;
}

// Query keys
export const adminDashboardKeys = {
  all: ['admin-dashboard'] as const,
  stats: () => [...adminDashboardKeys.all, 'stats'] as const,
  activity: (limit?: number) => [...adminDashboardKeys.all, 'activity', { limit }] as const,
  status: () => [...adminDashboardKeys.all, 'status'] as const,
};

// Individual hooks
export function useAdminStats() {
  return useQuery({
    queryKey: adminDashboardKeys.stats(),
    queryFn: fetchStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

export function useAdminActivity(limit: number = 10) {
  return useQuery({
    queryKey: adminDashboardKeys.activity(limit),
    queryFn: () => fetchActivity(limit),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: adminDashboardKeys.status(),
    queryFn: fetchStatus,
    refetchInterval: 15000, // Refresh every 15 seconds for status
    staleTime: 5000,
  });
}

// Combined hook for all dashboard data
export function useAdminDashboard(activityLimit: number = 10) {
  const queryClient = useQueryClient();
  
  const statsQuery = useAdminStats();
  const activityQuery = useAdminActivity(activityLimit);
  const statusQuery = useSystemStatus();
  
  const isLoading = statsQuery.isLoading || activityQuery.isLoading || statusQuery.isLoading;
  const isError = statsQuery.isError || activityQuery.isError || statusQuery.isError;
  const error = statsQuery.error || activityQuery.error || statusQuery.error;
  
  const refetch = async () => {
    await Promise.all([
      statsQuery.refetch(),
      activityQuery.refetch(),
      statusQuery.refetch(),
    ]);
  };
  
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: adminDashboardKeys.all });
  };
  
  return {
    // Data
    stats: statsQuery.data,
    activity: activityQuery.data,
    status: statusQuery.data,
    
    // Loading states
    isLoading,
    isStatsLoading: statsQuery.isLoading,
    isActivityLoading: activityQuery.isLoading,
    isStatusLoading: statusQuery.isLoading,
    
    // Error states
    isError,
    error,
    
    // Refetch functions
    refetch,
    refetchStats: statsQuery.refetch,
    refetchActivity: activityQuery.refetch,
    refetchStatus: statusQuery.refetch,
    invalidateAll,
    
    // Query states
    statsQuery,
    activityQuery,
    statusQuery,
  };
}

// Helper to format relative time
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} min ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Helper to get icon type from activity event
export function getActivityIconType(type: ActivityEvent['type']): string {
  switch (type) {
    case 'user':
      return 'users';
    case 'auth':
      return 'key';
    case 'security':
      return 'shield';
    case 'data':
      return 'database';
    case 'system':
      return 'settings';
    default:
      return 'activity';
  }
}

