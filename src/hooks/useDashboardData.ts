'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRealTimeData } from '@/hooks/useRealTimeData';

interface UseDashboardDataResult {
  metrics: any | null;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  connected: boolean;
}

export function useDashboardData(): UseDashboardDataResult {
  const rt = useRealTimeData({ table: 'dashboard_metrics', autoReconnect: true });
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/metrics', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const json = await res.json();
      return json;
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refetch();
    }, 2000);
  }, [refetch]);

  useEffect(() => {
    if (rt.lastUpdate) scheduleRefetch();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rt.lastUpdate, scheduleRefetch]);

  return {
    metrics: data?.data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : ((error as any)?.toString?.() ?? null),
    lastUpdate: rt.lastUpdate,
    connected: rt.connected,
  };
}

export default useDashboardData;
