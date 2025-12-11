/**
 * Compact Inventory Value Meter for Sidebar
 * Old-school VU meter-style vertical segmented bar visualization
 */

'use client';

import React from 'react';
import { useInventoryByCategory, formatCurrency } from '@/hooks/api/useDashboardWidgets';

export function InventoryValueMeter() {
  const { data, isLoading, error } = useInventoryByCategory('month');

  if (isLoading) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-primary" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-muted-foreground text-xs">Unable to load data</p>
      </div>
    );
  }

  const totalValue = data.summary?.totalValue || 0;
  const maxValue = 100000000; // R100M as max for gauge scale
  const percentage = Math.min((totalValue / maxValue) * 100, 100);

  // VU meter segments - 7 segments total
  // Colors from top (red) to bottom (green)
  const segments = [
    { color: '#DC2626', threshold: 85 }, // Red - top
    { color: '#EA580C', threshold: 70 }, // Orange-red
    { color: '#F97316', threshold: 55 }, // Orange
    { color: '#FBBF24', threshold: 40 }, // Yellow-orange
    { color: '#FCD34D', threshold: 25 }, // Yellow
    { color: '#84CC16', threshold: 10 }, // Light green
    { color: '#22C55E', threshold: 0 }, // Green - bottom
  ];

  // Calculate how many segments should be active
  const activeSegments = segments.filter(seg => percentage >= seg.threshold).length;

  return (
    <div className="w-full space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium">SYSTEM PROCESSING</p>
        <p className="text-sm font-semibold text-foreground">{formatCurrency(totalValue)}</p>
      </div>
      
      {/* VU Meter - Vertical Segmented Bars (stacked vertically) */}
      <div className="flex flex-col items-center gap-1">
        {segments.map((segment, index) => {
          const isActive = index < activeSegments;
          const reverseIndex = segments.length - index - 1; // Reverse order (red at top)
          
          return (
            <div
              key={index}
              className={`w-full rounded-full transition-all duration-500 ${
                isActive ? 'opacity-100' : 'opacity-30'
              }`}
              style={{
                height: '14px',
                backgroundColor: segment.color,
                boxShadow: isActive
                  ? `0 2px 6px ${segment.color}50, inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.2)`
                  : `inset 0 1px 2px rgba(0,0,0,0.15)`,
                transform: isActive ? 'scale(1.02)' : 'scale(0.98)',
                border: isActive ? `1px solid ${segment.color}80` : '1px solid rgba(0,0,0,0.1)',
              }}
            />
          );
        })}
      </div>

      {/* Scale indicators */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Low</span>
        <span className="text-muted-foreground">High</span>
      </div>
    </div>
  );
}

