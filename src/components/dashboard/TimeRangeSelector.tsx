/**
 * Time Range Selector — underline tabs (uncodixfy: no pill group)
 */

'use client';

import React from 'react';
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
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className={cn('flex border-b border-border', className)}>
      {ranges.map(range => (
        <button
          key={range.value}
          type="button"
          onClick={() => onChange(range.value)}
          className={cn(
            'px-3 py-2 text-sm font-medium transition-colors',
            value === range.value
              ? 'border-b-2 border-foreground text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {range.label}
        </button>
      ))}
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
