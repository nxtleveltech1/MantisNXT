'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface PerformanceData {
  time: string;
  deliveries: number;
  revenue: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const maxDeliveries = Math.max(...data.map((d) => d.deliveries));
  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Performance Trends</span>
          <div className="flex items-center gap-1 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">+18% today</span>
          </div>
        </CardTitle>
        <CardDescription>Hourly delivery and revenue performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Simple bar chart representation */}
          <div className="grid grid-cols-7 gap-2 h-32">
            {data.map((item, index) => (
              <div key={index} className="flex flex-col justify-end items-center">
                <div className="w-full space-y-1">
                  {/* Revenue bar */}
                  <div
                    className="w-full bg-blue-200 rounded-sm"
                    style={{ height: `${(item.revenue / maxRevenue) * 60}px` }}
                  ></div>
                  {/* Deliveries bar */}
                  <div
                    className="w-full bg-green-200 rounded-sm"
                    style={{ height: `${(item.deliveries / maxDeliveries) * 40}px` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 mt-1">{item.time}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span>Deliveries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-200 rounded"></div>
              <span>Revenue (ZAR)</span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-bold">{data[data.length - 1]?.deliveries || 0}</div>
              <div className="text-xs text-gray-600">Current Hour</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">ZAR {data[data.length - 1]?.revenue || 0}</div>
              <div className="text-xs text-gray-600">Revenue/Hour</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



