/**
 * Price Trend Chart Component
 * 
 * Displays historical price trends over time using Recharts
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface PriceTrendDataPoint {
  date: Date | string;
  avg_price: number;
  min_price: number;
  max_price: number;
  products_count: number;
}

interface PriceTrendChartProps {
  data: PriceTrendDataPoint[];
  loading?: boolean;
}

export function PriceTrendChart({ data, loading }: PriceTrendChartProps) {
  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Loading price trends...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No price trend data available
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map(point => ({
    date: typeof point.date === 'string' 
      ? new Date(point.date).toLocaleDateString() 
      : point.date.toLocaleDateString(),
    'Average Price': Number(point.avg_price),
    'Min Price': Number(point.min_price),
    'Max Price': Number(point.max_price),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value.toFixed(2)}`}
        />
        <Tooltip 
          formatter={(value: number) => `$${value.toFixed(2)}`}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="Average Price" 
          stroke="#8884d8" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="Min Price" 
          stroke="#82ca9d" 
          strokeWidth={1}
          strokeDasharray="5 5"
        />
        <Line 
          type="monotone" 
          dataKey="Max Price" 
          stroke="#ffc658" 
          strokeWidth={1}
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

