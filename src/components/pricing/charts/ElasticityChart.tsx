/**
 * Price Elasticity Chart Component
 * 
 * Displays price elasticity analysis with optimal price range
 */

'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export interface ElasticityDataPoint {
  price: number;
  quantity: number;
  revenue: number;
  elasticity_coefficient?: number;
}

export interface ElasticityChartData {
  data_points: ElasticityDataPoint[];
  optimal_price?: number;
  current_price?: number;
  price_range: {
    min: number;
    max: number;
  };
}

interface ElasticityChartProps {
  data: ElasticityChartData;
  loading?: boolean;
}

export function ElasticityChart({ data, loading }: ElasticityChartProps) {
  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Loading elasticity data...
      </div>
    );
  }

  if (!data || !data.data_points || data.data_points.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No elasticity data available
      </div>
    );
  }

  // Format data for scatter chart (price vs quantity)
  const chartData = data.data_points.map(point => ({
    price: Number(point.price),
    quantity: Number(point.quantity),
    revenue: Number(point.revenue),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          type="number"
          dataKey="price" 
          name="Price"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value.toFixed(2)}`}
          domain={['dataMin', 'dataMax']}
        />
        <YAxis 
          type="number"
          dataKey="quantity" 
          name="Quantity"
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value: number, name: string) => {
            if (name === 'price') return `$${value.toFixed(2)}`;
            if (name === 'revenue') return `$${value.toFixed(2)}`;
            return value;
          }}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        {data.optimal_price && (
          <ReferenceLine 
            x={data.optimal_price} 
            stroke="#ff7300" 
            strokeDasharray="5 5"
            label={{ value: 'Optimal Price', position: 'top' }}
          />
        )}
        {data.current_price && (
          <ReferenceLine 
            x={data.current_price} 
            stroke="#8884d8" 
            strokeDasharray="3 3"
            label={{ value: 'Current Price', position: 'top' }}
          />
        )}
        <Scatter 
          name="Price-Quantity Relationship" 
          data={chartData} 
          fill="#8884d8"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

