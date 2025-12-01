'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, XCircle, Package, ShoppingCart, Clock, TrendingDown } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory';

interface StockAlertsProps {
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
  className?: string;
}

export function StockAlerts({ lowStockItems, outOfStockItems, className }: StockAlertsProps) {
  const allAlerts = [
    ...outOfStockItems.map(item => ({ ...item, alertType: 'out_of_stock' as const })),
    ...lowStockItems.map(item => ({ ...item, alertType: 'low_stock' as const })),
  ].slice(0, 10); // Show only top 10 alerts

  if (allAlerts.length === 0) {
    return (
      <div className={`py-8 text-center ${className}`}>
        <Package className="mx-auto mb-3 h-12 w-12 text-green-500" />
        <h3 className="mb-1 text-lg font-medium text-green-700">All Good!</h3>
        <p className="text-muted-foreground text-sm">
          No stock alerts at the moment. All items are at healthy levels.
        </p>
      </div>
    );
  }

  const getAlertIcon = (alertType: 'low_stock' | 'out_of_stock') => {
    switch (alertType) {
      case 'out_of_stock':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'low_stock':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getAlertSeverity = (alertType: 'low_stock' | 'out_of_stock') => {
    switch (alertType) {
      case 'out_of_stock':
        return 'destructive' as const;
      case 'low_stock':
        return 'secondary' as const;
    }
  };

  const getAlertBackground = (alertType: 'low_stock' | 'out_of_stock') => {
    switch (alertType) {
      case 'out_of_stock':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'low_stock':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
    }
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="destructive" className="text-xs">
            {outOfStockItems.length} Out of Stock
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {lowStockItems.length} Low Stock
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {allAlerts.map(item => (
            <div
              key={item.id}
              className={`rounded-lg border p-3 transition-colors ${getAlertBackground(item.alertType)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 items-start space-x-3">
                  {getAlertIcon(item.alertType)}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center space-x-2">
                      <h4 className="truncate text-sm font-medium">{item.name}</h4>
                      <Badge variant={getAlertSeverity(item.alertType)} className="text-xs">
                        {item.alertType === 'out_of_stock' ? 'Out' : 'Low'}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground mb-2 text-xs">
                      SKU: {item.sku} • {item.category}
                    </p>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-4">
                        <span
                          className={
                            item.alertType === 'out_of_stock'
                              ? 'font-medium text-red-600'
                              : 'font-medium text-yellow-600'
                          }
                        >
                          Stock: {item.currentStock} {item.unit}
                        </span>
                        <span className="text-muted-foreground">Reorder: {item.reorderPoint}</span>
                      </div>

                      <div className="text-muted-foreground flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatLastUpdate(item.lastStockUpdate)}</span>
                      </div>
                    </div>

                    {item.supplierName && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Supplier: {item.supplierName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-opacity-20 mt-3 flex items-center justify-between border-t border-current pt-2">
                <div className="flex items-center space-x-2">
                  {item.alertType === 'out_of_stock' && (
                    <Badge
                      variant="outline"
                      className="border-red-300 bg-red-100 text-xs text-red-700"
                    >
                      <TrendingDown className="mr-1 h-3 w-3" />
                      Critical
                    </Badge>
                  )}

                  {item.alerts.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {item.alerts.length} alert{item.alerts.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    Reorder
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {allAlerts.length >= 10 && (
        <div className="mt-4 border-t pt-3">
          <Button variant="outline" className="w-full" size="sm">
            View All Alerts ({lowStockItems.length + outOfStockItems.length})
          </Button>
        </div>
      )}
    </div>
  );
}
