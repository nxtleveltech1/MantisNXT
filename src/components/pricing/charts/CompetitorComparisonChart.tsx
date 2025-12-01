/**
 * Competitor Comparison Chart Component
 *
 * Displays price comparison between our prices and competitor prices
 */

'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface CompetitorComparisonData {
  product_name: string;
  our_price: number;
  market_avg: number;
  competitor_prices: Array<{
    name: string;
    price: number;
  }>;
}

interface CompetitorComparisonChartProps {
  data: CompetitorComparisonData[];
  loading?: boolean;
}

export function CompetitorComparisonChart({ data, loading }: CompetitorComparisonChartProps) {
  if (loading) {
    return (
      <div className="text-muted-foreground flex h-[300px] items-center justify-center">
        Loading competitor data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[300px] items-center justify-center">
        No competitor comparison data available
      </div>
    );
  }

  // Format data for chart - show first 10 products
  const chartData = data.slice(0, 10).map(item => ({
    name:
      item.product_name.length > 20
        ? item.product_name.substring(0, 20) + '...'
        : item.product_name,
    'Our Price': Number(item.our_price),
    'Market Average': Number(item.market_avg),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={value => `$${value.toFixed(2)}`} />
        <Tooltip
          formatter={(value: number) => `$${value.toFixed(2)}`}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Bar dataKey="Our Price" fill="#8884d8" />
        <Bar dataKey="Market Average" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
}
