'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  BarChart3,
  Settings,
  Bell,
} from 'lucide-react';
import { DeliveryStatusWidget } from '@/components/logistics/DeliveryStatusWidget';
import { LiveMetrics } from '@/components/logistics/LiveMetrics';
import { CourierMapAdvanced } from '@/components/logistics/CourierMapAdvanced';
import { AlertsPanel } from '@/components/logistics/AlertsPanel';
import { PerformanceChart } from '@/components/logistics/PerformanceChart';
import { QuickActions } from '@/components/logistics/QuickActions';
import { SouthAfricanDashboardStats } from '@/components/logistics/SouthAfricanDashboardStats';

export default function LogisticsDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Mock data - in real app, this would come from your API
  const dashboardStats = {
    totalDeliveries: 247,
    activeDeliveries: 24,
    completedToday: 47,
    pendingPickups: 12,
    activeCouriers: 8,
    totalCouriers: 15,
    avgDeliveryTime: '32 min',
    successRate: 94.2,
    revenue: 12450,
    customerSatisfaction: 4.8,
  };

  const recentAlerts = [
    {
      id: 1,
      type: 'warning',
      message: 'Courier Thabo Mthembu has been delayed for 15+ minutes',
      time: '2 min ago',
      deliveryId: 'DEL-001',
    },
    {
      id: 2,
      type: 'error',
      message: 'Failed delivery attempt - Customer not available',
      time: '5 min ago',
      deliveryId: 'DEL-045',
    },
    {
      id: 3,
      type: 'info',
      message: 'New courier Nomsa Dlamini has joined the team',
      time: '1 hour ago',
      deliveryId: null,
    },
  ];

  const performanceData = [
    { time: '9:00', deliveries: 5, revenue: 125 },
    { time: '10:00', deliveries: 8, revenue: 200 },
    { time: '11:00', deliveries: 12, revenue: 300 },
    { time: '12:00', deliveries: 15, revenue: 375 },
    { time: '13:00', deliveries: 18, revenue: 450 },
    { time: '14:00', deliveries: 22, revenue: 550 },
    { time: '15:00', deliveries: 25, revenue: 625 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Logistics Management Dashboard</h1>
              <p className="text-gray-600">Real-time overview of your delivery operations</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live Updates</span>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Alerts (3)
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.activeDeliveries}</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% from yesterday
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Couriers</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats.activeCouriers}/{dashboardStats.totalCouriers}
              </div>
              <Progress
                value={(dashboardStats.activeCouriers / dashboardStats.totalCouriers) * 100}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.successRate}%</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +2.1% this week
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">ZAR {dashboardStats.revenue.toLocaleString()}</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +18% from yesterday
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live-tracking">Live Tracking</TabsTrigger>
            <TabsTrigger value="couriers">Couriers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Metrics */}
              <div className="lg:col-span-2 space-y-6">
                <LiveMetrics />
                <PerformanceChart data={performanceData} />
              </div>

              {/* Side Panel */}
              <div className="space-y-6">
                <DeliveryStatusWidget deliveryIds={['DEL-001', 'DEL-002', 'DEL-003']} />
                <AlertsPanel alerts={recentAlerts} />
                <QuickActions />
              </div>
            </div>

            {/* Add South African specific stats */}
            <SouthAfricanDashboardStats />
          </TabsContent>

          {/* Live Tracking Tab */}
          <TabsContent value="live-tracking" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <CourierMapAdvanced />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Active Deliveries</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { id: 'DEL-001', courier: 'Thabo Mthembu', status: 'in_transit', eta: '15 min' },
                      { id: 'DEL-002', courier: 'Nomsa Dlamini', status: 'out_for_delivery', eta: '8 min' },
                      { id: 'DEL-003', courier: 'Pieter van der Merwe', status: 'pickup', eta: '22 min' },
                    ].map((delivery) => (
                      <div key={delivery.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-mono text-xs">{delivery.id}</p>
                          <p className="text-sm">{delivery.courier}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {delivery.status}
                          </Badge>
                          <p className="text-xs text-gray-600">ETA: {delivery.eta}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Couriers Tab */}
          <TabsContent value="couriers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Courier Performance</CardTitle>
                  <CardDescription>Today&apos;s courier statistics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: 'Thabo Mthembu', deliveries: 8, rating: 4.9, status: 'active' },
                    { name: 'Nomsa Dlamini', deliveries: 12, rating: 4.8, status: 'active' },
                    { name: 'Pieter van der Merwe', deliveries: 6, rating: 4.7, status: 'break' },
                    { name: 'Lerato Molefe', deliveries: 4, rating: 4.6, status: 'active' },
                  ].map((courier) => (
                    <div key={courier.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{courier.name}</p>
                        <p className="text-sm text-gray-600">{courier.deliveries} deliveries today</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">⭐ {courier.rating}</span>
                          <Badge variant={courier.status === 'active' ? 'default' : 'secondary'}>
                            {courier.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fleet Status</CardTitle>
                  <CardDescription>Vehicle and courier availability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">8</div>
                      <div className="text-sm text-green-700">Available</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">5</div>
                      <div className="text-sm text-blue-700">On Delivery</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">2</div>
                      <div className="text-sm text-orange-700">On Break</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">0</div>
                      <div className="text-sm text-gray-700">Offline</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Trends</CardTitle>
                  <CardDescription>Performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <PerformanceChart data={performanceData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regional Performance</CardTitle>
                  <CardDescription>Delivery success by region</CardDescription>
                </CardHeader>
                <CardContent>
                  <SouthAfricanDashboardStats />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickActions />
              <AlertsPanel alerts={recentAlerts} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}




