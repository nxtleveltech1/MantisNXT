'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Sample data for charts
const inventoryTrendsData = [
  { month: 'Jan', totalValue: 145000, totalItems: 1250, stockOuts: 12, lowStock: 45 },
  { month: 'Feb', totalValue: 158000, totalItems: 1380, stockOuts: 8, lowStock: 32 },
  { month: 'Mar', totalValue: 162000, totalItems: 1420, stockOuts: 15, lowStock: 56 },
  { month: 'Apr', totalValue: 175000, totalItems: 1520, stockOuts: 6, lowStock: 28 },
  { month: 'May', totalValue: 168000, totalItems: 1480, stockOuts: 10, lowStock: 38 },
  { month: 'Jun', totalValue: 182000, totalItems: 1580, stockOuts: 4, lowStock: 22 },
];

const categoryDistribution = [
  { name: 'Electronics', value: 45, color: '#0088FE' },
  { name: 'Furniture', value: 28, color: '#00C49F' },
  { name: 'Office Supplies', value: 18, color: '#FFBB28' },
  { name: 'Accessories', value: 9, color: '#FF8042' },
];

const stockLevelData = [
  { month: 'Jan', optimal: 85, low: 12, outOfStock: 3 },
  { month: 'Feb', optimal: 88, low: 9, outOfStock: 3 },
  { month: 'Mar', optimal: 82, low: 15, outOfStock: 3 },
  { month: 'Apr', optimal: 91, low: 7, outOfStock: 2 },
  { month: 'May', optimal: 87, low: 11, outOfStock: 2 },
  { month: 'Jun', optimal: 93, low: 6, outOfStock: 1 },
];

const turnoverData = [
  { category: 'Electronics', turnover: 6.2, target: 5.0 },
  { category: 'Furniture', turnover: 3.8, target: 4.0 },
  { category: 'Office Supplies', turnover: 8.1, target: 7.0 },
  { category: 'Accessories', turnover: 4.9, target: 5.5 },
];

interface TooltipProps {
  active?: boolean;
  payload?: unknown[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="mb-1 text-sm font-medium">{label}</p>
        {payload.map((entry: unknown, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}:{' '}
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function InventoryChart() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Tabs defaultValue="trends" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="distribution">Distribution</TabsTrigger>
        <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
        <TabsTrigger value="turnover">Turnover</TabsTrigger>
      </TabsList>

      <TabsContent value="trends" className="space-y-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={inventoryTrendsData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorItems" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e0e0e0' }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                tickFormatter={value => formatCurrency(value)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="totalValue"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorValue)"
                name="Total Value"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="totalItems"
                stroke="#82ca9d"
                fillOpacity={1}
                fill="url(#colorItems)"
                name="Total Items"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </TabsContent>

      <TabsContent value="distribution" className="space-y-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </TabsContent>

      <TabsContent value="stock-levels" className="space-y-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockLevelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e0e0e0' }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                tickFormatter={value => `${value}%`}
              />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend />
              <Bar dataKey="optimal" stackId="a" fill="#10b981" name="Optimal Stock" />
              <Bar dataKey="low" stackId="a" fill="#f59e0b" name="Low Stock" />
              <Bar dataKey="outOfStock" stackId="a" fill="#ef4444" name="Out of Stock" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TabsContent>

      <TabsContent value="turnover" className="space-y-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={turnoverData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                tickFormatter={value => `${value}x`}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                width={80}
              />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value: number, name: string) => [`${value}x`, name]}
              />
              <Legend />
              <Bar dataKey="turnover" fill="#3b82f6" name="Actual Turnover" />
              <Bar dataKey="target" fill="#e5e7eb" name="Target Turnover" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TabsContent>
    </Tabs>
  );
}
