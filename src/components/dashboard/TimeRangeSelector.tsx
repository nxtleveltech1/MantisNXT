/**
 * Time Range Selector Component
 * Allows users to filter dashboard data by time period
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimeRange = 'today' | 'week' | 'month' | 'custom';

export interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Calendar className="text-muted-foreground h-4 w-4" />
      <div className="border-border bg-muted/50 flex gap-1 rounded-lg border p-1">
        {ranges.map(range => (
          <Button
            key={range.value}
            variant={value === range.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(range.value)}
            className={cn(
              'text-xs',
              value === range.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted-foreground/10'
            )}
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Hook to manage time range state with localStorage persistence
export function useTimeRange(defaultRange: TimeRange = 'month') {
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard-time-range');
      return (stored as TimeRange) || defaultRange;
    }
    return defaultRange;
  });

  const handleChange = (range: TimeRange) => {
    setTimeRange(range);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-time-range', range);
    }
  };

  return [timeRange, handleChange] as const;
}
