'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package,
  DollarSign,
  AlertTriangle,
  XCircle,
  Warehouse,
  Clock,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import type { InventoryMetrics } from '@/types/inventory';

export function InventoryMetricsCards({ metrics }: { metrics: InventoryMetrics | null }) {
  if (!metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="mb-2 h-4 w-24 rounded bg-gray-200"></div>
                <div className="h-8 w-16 rounded bg-gray-200"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getChangeIndicator = (value: number, isPositive: boolean = true) => {
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const icon = isPositive ? TrendingUp : TrendingUp;
    const Icon = icon;

    return (
      <div className={`flex items-center space-x-1 ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">{Math.abs(value)}%</span>
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <Package className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalItems.toLocaleString()}</div>
          <p className="text-muted-foreground text-xs">Across all warehouses</p>
        </CardContent>
      </Card>

      {/* Total Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <DollarSign className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
          <p className="text-muted-foreground text-xs">Current inventory value</p>
        </CardContent>
      </Card>

      {/* Low Stock Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{metrics.lowStockItems}</div>
          <p className="text-muted-foreground text-xs">Items below reorder point</p>
        </CardContent>
      </Card>

      {/* Out of Stock Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{metrics.outOfStockItems}</div>
          <p className="text-muted-foreground text-xs">Items with zero stock</p>
        </CardContent>
      </Card>

      {/* Warehouses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
          <Warehouse className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalWarehouses}</div>
          <p className="text-muted-foreground text-xs">Active locations</p>
        </CardContent>
      </Card>

      {/* Turnover Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Turnover Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.turnoverRate.toFixed(1)}x</div>
          <p className="text-muted-foreground text-xs">Annual turnover ratio</p>
        </CardContent>
      </Card>

      {/* Average Days in Stock */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Days in Stock</CardTitle>
          <Clock className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.averageDaysInStock}</div>
          <p className="text-muted-foreground text-xs">Days inventory on hand</p>
        </CardContent>
      </Card>

      {/* Pending Adjustments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Adjustments</CardTitle>
          <RefreshCw className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{metrics.pendingAdjustments}</div>
          <p className="text-muted-foreground text-xs">Awaiting approval</p>
        </CardContent>
      </Card>
    </div>
  );
}
