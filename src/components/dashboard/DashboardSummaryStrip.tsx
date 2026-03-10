/**
 * Dashboard summary strip — single line of key metrics (uncodixfy: no KPI grid)
 */

'use client';

import React from 'react';

const formatZARCompact = (value: number) => {
  if (value >= 1000000) return `R ${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `R ${(value / 1000).toFixed(1)}K`;
  return `R ${value.toFixed(2)}`;
};

export interface DashboardSummaryStripProps {
  salesTotal: number;
  orderCount: number;
  inventoryValue: number;
  stockAlerts: number;
  activeSuppliers: number;
  salesLoading?: boolean;
}

export function DashboardSummaryStrip({
  salesTotal,
  orderCount,
  inventoryValue,
  stockAlerts,
  activeSuppliers,
  salesLoading,
}: DashboardSummaryStripProps) {
  const items = [
    { label: 'Sales', value: salesLoading ? '...' : formatZARCompact(salesTotal) },
    { label: 'orders', value: String(orderCount) },
    { label: 'Inventory', value: formatZARCompact(inventoryValue) },
    { label: 'alerts', value: String(stockAlerts) },
    { label: 'suppliers', value: String(activeSuppliers) },
  ];

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border pb-3 text-sm">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-baseline gap-1.5">
          {i > 0 && <span className="text-muted-foreground/60">·</span>}
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-medium text-foreground">{item.value}</span>
        </span>
      ))}
    </div>
  );
}
