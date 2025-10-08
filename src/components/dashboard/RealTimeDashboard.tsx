/**
 * Real-Time Analytics Dashboard
 * Live metrics from all 102 enterprise tables
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { Activity, Users, Package, DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import ActivityFeed from './ActivityFeed';
import DataErrorBoundary from '@/components/error-boundaries/DataErrorBoundary';
import { formatTimestamp } from '@/lib/utils/date-utils';

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalInventoryItems: number;
  lowStockItems: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>;
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
  inventoryStatus: Array<{ category: string; count: number; value: number }>;
  recentActivity: Array<{ id: string; type: string; description: string; timestamp: string }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function RealTimeDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time data connections
  const ordersData = useRealTimeData({
    table: 'sales_orders',
    autoReconnect: true
  });

  const inventoryData = useRealTimeData({
    table: 'inventory_items',
    autoReconnect: true
  });

  const customersData = useRealTimeData({
    table: 'customers',
    autoReconnect: true
  });

  const invoicesData = useRealTimeData({
    table: 'invoices',
    autoReconnect: true
  });

  /**
   * Fetch dashboard metrics
   */
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/metrics', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const result = await response.json();

      if (result.success) {
        setMetrics(result.data);
      } else {
        throw new Error(result.error || 'Failed to load metrics');
      }

    } catch (err) {
      console.error('❌ Error fetching dashboard metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update metrics when real-time data changes
   */
  useEffect(() => {
    if (ordersData.lastUpdate || inventoryData.lastUpdate || customersData.lastUpdate || invoicesData.lastUpdate) {
      // Debounce updates to prevent excessive API calls
      const timeoutId = setTimeout(() => {
        fetchMetrics();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [ordersData.lastUpdate, inventoryData.lastUpdate, customersData.lastUpdate, invoicesData.lastUpdate]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchMetrics();
  }, []);

  /**
   * Format currency
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  /**
   * Format number with commas
   */
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading real-time dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <DataErrorBoundary category="ui" retryable={true}>
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Real-Time Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${ordersData.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">Orders</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${inventoryData.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">Inventory</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${customersData.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">Customers</span>
            </div>
          </div>
        </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalOrders)}</div>
            <p className="text-xs text-muted-foreground">
              <CheckCircle className="inline h-3 w-3 mr-1" />
              {metrics.completedOrders} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +5.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalInventoryItems)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.lowStockItems > 0 ? (
                <>
                  <AlertTriangle className="inline h-3 w-3 mr-1 text-red-500" />
                  <span className="text-red-600">{metrics.lowStockItems} low stock</span>
                </>
              ) : (
                <>
                  <CheckCircle className="inline h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-600">All items in stock</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Status</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue and order count over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value as number) : formatNumber(value as number),
                      name === 'revenue' ? 'Revenue' : 'Orders'
                    ]} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
                <CardDescription>Current order status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Completed Orders</span>
                      <span>{formatNumber(metrics.completedOrders)}</span>
                    </div>
                    <Progress
                      value={(metrics.completedOrders / metrics.totalOrders) * 100}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Pending Orders</span>
                      <span>{formatNumber(metrics.pendingOrders)}</span>
                    </div>
                    <Progress
                      value={(metrics.pendingOrders / metrics.totalOrders) * 100}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Cancelled Orders</span>
                      <span>{formatNumber(metrics.cancelledOrders)}</span>
                    </div>
                    <Progress
                      value={(metrics.cancelledOrders / metrics.totalOrders) * 100}
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status by Category</CardTitle>
              <CardDescription>Current inventory distribution and value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.inventoryStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.inventoryStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-4">
                  {metrics.inventoryStatus.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatNumber(category.count)} items</div>
                        <div className="text-sm text-gray-600">{formatCurrency(category.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>Best selling products by revenue and quantity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={metrics.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(value as number) : formatNumber(value as number),
                    name === 'revenue' ? 'Revenue' : 'Sales'
                  ]} />
                  <Bar dataKey="sales" fill="#8884d8" />
                  <Bar dataKey="revenue" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <DataErrorBoundary category="data" retryable={true}>
            <ActivityFeed
              limit={10}
              autoRefresh={true}
              refreshInterval={30000}
              showMetrics={true}
            />
          </DataErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Live Updates Indicator */}
      {(ordersData.lastUpdate || inventoryData.lastUpdate) && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse h-2 w-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Live data updated</span>
          </div>
        </div>
      )}
      </div>
    </DataErrorBoundary>
  );
}