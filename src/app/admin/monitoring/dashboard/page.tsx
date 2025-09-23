"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  Monitor,
  Wifi
} from "lucide-react"

interface SystemMetric {
  name: string
  value: number
  unit: string
  status: 'healthy' | 'warning' | 'critical'
  change: number
  icon: React.ReactNode
}

interface ServiceStatus {
  name: string
  status: 'online' | 'offline' | 'degraded'
  uptime: string
  responseTime: number
  lastCheck: string
  url?: string
}

interface AlertItem {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: string
  acknowledged: boolean
  source: string
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    {
      name: 'CPU Usage',
      value: 45,
      unit: '%',
      status: 'healthy',
      change: -2.3,
      icon: <Cpu className="h-5 w-5" />
    },
    {
      name: 'Memory Usage',
      value: 72,
      unit: '%',
      status: 'warning',
      change: 5.1,
      icon: <MemoryStick className="h-5 w-5" />
    },
    {
      name: 'Disk Usage',
      value: 34,
      unit: '%',
      status: 'healthy',
      change: 1.2,
      icon: <HardDrive className="h-5 w-5" />
    },
    {
      name: 'Network I/O',
      value: 890,
      unit: 'MB/s',
      status: 'healthy',
      change: -12.5,
      icon: <Network className="h-5 w-5" />
    }
  ])

  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Web Server',
      status: 'online',
      uptime: '99.98%',
      responseTime: 145,
      lastCheck: '30 seconds ago',
      url: 'https://api.mantisnxt.com'
    },
    {
      name: 'Database',
      status: 'online',
      uptime: '99.95%',
      responseTime: 23,
      lastCheck: '15 seconds ago'
    },
    {
      name: 'Redis Cache',
      status: 'online',
      uptime: '99.99%',
      responseTime: 8,
      lastCheck: '45 seconds ago'
    },
    {
      name: 'Email Service',
      status: 'degraded',
      uptime: '98.12%',
      responseTime: 2340,
      lastCheck: '2 minutes ago'
    },
    {
      name: 'Background Jobs',
      status: 'online',
      uptime: '99.87%',
      responseTime: 1200,
      lastCheck: '1 minute ago'
    },
    {
      name: 'File Storage',
      status: 'online',
      uptime: '99.92%',
      responseTime: 234,
      lastCheck: '30 seconds ago'
    }
  ])

  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: '1',
      type: 'warning',
      message: 'High memory usage detected on web server (72%)',
      timestamp: '2023-12-15T14:30:00Z',
      acknowledged: false,
      source: 'System Monitor'
    },
    {
      id: '2',
      type: 'warning',
      message: 'Email service response time above threshold (2.3s)',
      timestamp: '2023-12-15T14:25:00Z',
      acknowledged: false,
      source: 'Service Monitor'
    },
    {
      id: '3',
      type: 'info',
      message: 'Database backup completed successfully',
      timestamp: '2023-12-15T02:00:00Z',
      acknowledged: true,
      source: 'Backup Service'
    },
    {
      id: '4',
      type: 'error',
      message: 'Failed login attempt from suspicious IP',
      timestamp: '2023-12-15T13:45:00Z',
      acknowledged: false,
      source: 'Security Monitor'
    }
  ])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update metrics with small random changes
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: Math.max(0, Math.min(100, metric.value + (Math.random() - 0.5) * 5)),
        change: (Math.random() - 0.5) * 10
      })))
      setLastUpdate(new Date())
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const refreshData = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdate(new Date())
    setIsRefreshing(false)
  }

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'warning':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      case 'critical':
      case 'offline':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const healthyServices = services.filter(s => s.status === 'online').length
  const totalServices = services.length
  const systemHealth = Math.round((healthyServices / totalServices) * 100)

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged)
  const criticalAlerts = alerts.filter(alert => alert.type === 'error' && !alert.acknowledged)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''}</strong> requiring immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">System Health</p>
                <p className="text-2xl font-bold">{systemHealth}%</p>
              </div>
              <Monitor className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Services Online</p>
                <p className="text-2xl font-bold">{healthyServices}/{totalServices}</p>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Alerts</p>
                <p className="text-2xl font-bold">{unacknowledgedAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Uptime</p>
                <p className="text-2xl font-bold">99.98%</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* System Metrics */}
        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.map((metric) => (
              <Card key={metric.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      {metric.icon}
                      {metric.name}
                    </div>
                    <Badge className={getStatusColor(metric.status)} variant="secondary">
                      {metric.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {metric.name === 'Network I/O' ? Math.round(metric.value) : metric.value.toFixed(1)}
                        {metric.unit}
                      </span>
                      <div className="flex items-center gap-1 text-sm">
                        {metric.change > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        <span className={metric.change > 0 ? 'text-red-500' : 'text-green-500'}>
                          {Math.abs(metric.change).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {metric.name !== 'Network I/O' && (
                      <Progress
                        value={metric.value}
                        className={`h-2 ${
                          metric.status === 'critical' ? 'bg-red-100' :
                          metric.status === 'warning' ? 'bg-yellow-100' : 'bg-green-100'
                        }`}
                      />
                    )}

                    <div className="text-xs text-gray-500">
                      {metric.status === 'healthy' && 'Operating within normal parameters'}
                      {metric.status === 'warning' && 'Approaching threshold limits'}
                      {metric.status === 'critical' && 'Immediate attention required'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Services Status */}
        <TabsContent value="services">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Card key={service.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      {service.name}
                    </div>
                    <Badge className={getStatusColor(service.status)} variant="secondary">
                      {service.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Uptime</p>
                      <p className="font-medium">{service.uptime}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Response Time</p>
                      <p className="font-medium">{service.responseTime}ms</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Last check: {service.lastCheck}
                  </div>

                  {service.url && (
                    <Button variant="outline" size="sm" className="w-full">
                      <Globe className="h-4 w-4 mr-2" />
                      View Service
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>System Alerts</span>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {unacknowledgedAlerts.length} unacknowledged
                  </Badge>
                  <Badge variant="outline">
                    {alerts.length} total
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-4 border rounded-lg ${
                      alert.acknowledged ? 'opacity-60' : ''
                    }`}
                  >
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className={
                            alert.type === 'error' ? 'bg-red-100 text-red-800' :
                            alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }
                        >
                          {alert.type}
                        </Badge>
                        <span className="text-xs text-gray-500">{alert.source}</span>
                      </div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{service.name}</span>
                        <span>{service.responseTime}ms</span>
                      </div>
                      <Progress
                        value={Math.min(100, (service.responseTime / 3000) * 100)}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {metrics.slice(0, 3).map((metric) => (
                    <div key={metric.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {metric.icon}
                          <span className="text-sm font-medium">{metric.name}</span>
                        </div>
                        <span className="text-sm">{metric.value.toFixed(1)}{metric.unit}</span>
                      </div>
                      <Progress value={metric.value} className="h-2" />
                      <div className="text-xs text-gray-500">
                        {metric.status === 'healthy' ? 'Normal' :
                         metric.status === 'warning' ? 'Above average' : 'Critical'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}