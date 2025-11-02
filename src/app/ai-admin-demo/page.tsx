'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AIServiceConfiguration,
  PredictionMonitor,
  AIAlertManagement,
  ForecastViewer,
  DashboardBuilder,
  WidgetConfiguration,
  AIServiceHealthMonitor,
} from '@/components/ai/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AIAdminDemoPage() {
  const [selectedTab, setSelectedTab] = useState('health');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">AI Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive AI service management, monitoring, and analytics
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          <TabsTrigger value="widgets">Widgets</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Service Health Monitor</CardTitle>
              <CardDescription>
                Real-time monitoring with auto-refresh every 30 seconds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIServiceHealthMonitor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Service Configuration</CardTitle>
              <CardDescription>
                Configure AI services with provider settings and test connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIServiceConfiguration />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Alert Management</CardTitle>
              <CardDescription>
                Monitor and manage AI-generated alerts by severity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIAlertManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prediction Monitor</CardTitle>
              <CardDescription>
                Track AI predictions with confidence scoring and accuracy metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PredictionMonitor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Forecast Viewer</CardTitle>
              <CardDescription>
                Visualize demand forecasts with confidence intervals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ForecastViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Builder</CardTitle>
              <CardDescription>
                Drag-and-drop dashboard builder with widget library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardBuilder />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="widgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Widget Configuration</CardTitle>
              <CardDescription>
                Configure widgets with visual query builder and live preview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WidgetConfiguration dashboardId="demo-dashboard-1" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
