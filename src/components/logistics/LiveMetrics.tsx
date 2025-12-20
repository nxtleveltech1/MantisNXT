'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function LiveMetrics() {
  const [metrics, setMetrics] = useState({
    deliveriesPerHour: 12,
    avgDeliveryTime: 28,
    activeRoutes: 8,
    customerSatisfaction: 4.8,
    trends: {
      deliveriesPerHour: 'up',
      avgDeliveryTime: 'down',
      activeRoutes: 'stable',
      customerSatisfaction: 'up',
    },
  });

  const { isConnected, simulateMessage } = useWebSocket('/api/v1/logistics/websocket', {
    onMessage: (message) => {
      if (message.type === 'METRICS_UPDATE') {
        setMetrics((prev) => ({
          ...prev,
          ...message.data,
        }));
      }
    },
  });

  // Simulate real-time metrics updates
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      // Simulate metrics changes
      setMetrics((prev) => ({
        ...prev,
        deliveriesPerHour: prev.deliveriesPerHour + (Math.random() > 0.5 ? 1 : -1),
        avgDeliveryTime: Math.max(15, prev.avgDeliveryTime + (Math.random() > 0.5 ? 1 : -1)),
        activeRoutes: Math.max(
          0,
          prev.activeRoutes + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0)
        ),
        customerSatisfaction: Math.min(
          5,
          Math.max(3, prev.customerSatisfaction + (Math.random() - 0.5) * 0.1)
        ),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Performance Metrics</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>Real-time operational performance indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{metrics.deliveriesPerHour}</div>
            <div className="text-sm text-blue-700 mb-1">Deliveries/Hour</div>
            <div
              className={`flex items-center justify-center gap-1 text-xs ${getTrendColor(metrics.trends.deliveriesPerHour)}`}
            >
              {getTrendIcon(metrics.trends.deliveriesPerHour)}
              <span>Live</span>
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{metrics.avgDeliveryTime}m</div>
            <div className="text-sm text-green-700 mb-1">Avg. Time</div>
            <div
              className={`flex items-center justify-center gap-1 text-xs ${getTrendColor(metrics.trends.avgDeliveryTime)}`}
            >
              {getTrendIcon(metrics.trends.avgDeliveryTime)}
              <span>Live</span>
            </div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{metrics.activeRoutes}</div>
            <div className="text-sm text-purple-700 mb-1">Active Routes</div>
            <div
              className={`flex items-center justify-center gap-1 text-xs ${getTrendColor(metrics.trends.activeRoutes)}`}
            >
              {getTrendIcon(metrics.trends.activeRoutes)}
              <span>Live</span>
            </div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {metrics.customerSatisfaction.toFixed(1)}
            </div>
            <div className="text-sm text-orange-700 mb-1">Satisfaction</div>
            <div
              className={`flex items-center justify-center gap-1 text-xs ${getTrendColor(metrics.trends.customerSatisfaction)}`}
            >
              {getTrendIcon(metrics.trends.customerSatisfaction)}
              <span>Live</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}








