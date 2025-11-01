"use client"

import React, { useState, useEffect } from 'react'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Database,
  Server,
  Activity,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
  HardDrive,
  
  Wifi,
  Shield,
  Globe,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Bell,
  Settings,
  Play,
  Pause,
  Download,
  Upload,
  AlertCircle,
  GitBranch,
  Gauge,
  Thermometer,
  
} from 'lucide-react'

interface SystemHealthData {
  overall: {
    status: string
    score: number
    lastUpdated: string
  }
  services: Array<{
    name: string
    status: 'healthy' | 'warning' | 'error'
    responseTime: number
    uptime: string
    requestsPerSecond: number
    errors: number
  }>
  databases: Array<{
    name: string
    status: 'connected' | 'disconnected' | 'slow'
    responseTime: number
    connections: {
      active: number
      total: number
    }
    queryPerformance: {
      avgQueryTime: number
      slowQueries: number
    }
  }>
  system: {
    cpu: {
      usage: number
      cores: number
      temperature?: number
    }
    memory: {
      used: number
      total: number
      percentage: number
    }
    disk: {
      used: number
      total: number
      percentage: number
    }
    network: {
      inbound: number
      outbound: number
    }
  }
  security: {
    ssl: { status: string; expiryDate: string }
    firewall: { status: string; blockedIPs: number }
    vulnerability: { status: string; findings: number }
  }
  application: {
    version: string
    uptime: string
    environment: string
  }
  performance: {
    availability: number
    errorRate: number
  }
}

const SystemHealth: React.FC = () => {
  const [systemData, setSystemData] = useState<SystemHealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [alerts, setAlerts] = useState<any[]>([])

  // Fetch system health data from API
  const fetchSystemData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/system-health')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSystemData(result.data)
          generateAlerts(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch system health data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate alerts based on system data
  const generateAlerts = (data: SystemHealthData) => {
    const newAlerts: any[] = []
    
    // Check service health
    data.services.forEach(service => {
      if (service.status === 'error') {
        newAlerts.push({
          type: 'error',
          service: service.name,
          message: `${service.name} is down`,
          timestamp: new Date().toISOString()
        })
      } else if (service.status === 'warning') {
        newAlerts.push({
          type: 'warning',
          service: service.name,
          message: `${service.name} has performance issues`,
          timestamp: new Date().toISOString()
        })
      }
    })
    
    // Check system resources
    if (data.system.cpu.usage > 80) {
      newAlerts.push({
        type: 'warning',
        service: 'System',
        message: `High CPU usage: ${data.system.cpu.usage}%`,
        timestamp: new Date().toISOString()
      })
    }
    
    setAlerts(newAlerts)
  }

  useEffect(() => {
    fetchSystemData()
    
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(fetchSystemData, 30000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
      case 'slow':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'bg-green-100 text-green-800'
      case 'warning':
      case 'slow':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
      case 'disconnected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 GB'
    const sizes = ['GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <SelfContainedLayout title="System Health" breadcrumbs={[]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
            <p className="text-muted-foreground">
              Real-time monitoring of system performance and services
            </p>
          </div>
          <div className="flex items-center gap-3">
            {alerts.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
            </Button>
            <Button 
              onClick={fetchSystemData} 
              disabled={loading}
              size="sm"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <Alert key={index} className={alert.type === 'error' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
                <AlertTriangle className={`h-4 w-4 ${alert.type === 'error' ? 'text-red-600' : 'text-yellow-600'}`} />
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{alert.service}: {alert.message}</span>
                    <span className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Overview Cards */}
        {systemData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{systemData.overall.score}%</div>
                <p className="text-xs text-muted-foreground">
                  Overall system health
                </p>
                <Progress value={systemData.overall.score} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemData.system.cpu.usage}%</div>
                <p className="text-xs text-muted-foreground">
                  {systemData.system.cpu.cores} cores active
                </p>
                <Progress value={systemData.system.cpu.usage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemData.system.memory.percentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(systemData.system.memory.used)} / {formatBytes(systemData.system.memory.total)}
                </p>
                <Progress value={systemData.system.memory.percentage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Health</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {systemData.databases.filter(db => db.status === 'connected').length}/{systemData.databases.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Databases online
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Availability</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{systemData.performance.availability.toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground">
                  System uptime
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* System Details */}
        <Tabs defaultValue="services" className="space-y-4">
          <TabsList>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="databases">Databases</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="application">Application</TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemData?.services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(service.status)}
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Uptime: {service.uptime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-sm font-medium">{service.responseTime}ms</div>
                          <div className="text-xs text-muted-foreground">Response</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{service.requestsPerSecond}</div>
                          <div className="text-xs text-muted-foreground">Req/sec</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-sm font-medium ${service.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {service.errors}
                          </div>
                          <div className="text-xs text-muted-foreground">Errors</div>
                        </div>
                        <Badge className={getStatusColor(service.status)}>
                          {service.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Databases Tab */}
          <TabsContent value="databases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {systemData?.databases.map((db, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(db.status)}
                          <h3 className="font-medium">{db.name}</h3>
                        </div>
                        <Badge className={getStatusColor(db.status)}>
                          {db.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm font-medium mb-1">Response Time</div>
                          <div className="text-lg font-bold">{db.responseTime}ms</div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium mb-1">Connections</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Progress 
                                value={(db.connections.active / db.connections.total) * 100} 
                                className="h-2"
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {db.connections.active}/{db.connections.total}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium mb-1">Query Performance</div>
                          <div className="text-sm">
                            Avg: {db.queryPerformance.avgQueryTime}ms
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Slow: {db.queryPerformance.slowQueries}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1">Status</div>
                          <Badge className={getStatusColor(db.status)}>
                            {db.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* System Resources */}
              <Card>
                <CardHeader>
                  <CardTitle>System Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        <span className="text-sm font-medium">CPU Usage</span>
                        {systemData?.system.cpu.temperature && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Thermometer className="h-3 w-3" />
                            {systemData.system.cpu.temperature}°C
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {systemData?.system.cpu.usage || 0}%
                      </span>
                    </div>
                    <Progress value={systemData?.system.cpu.usage || 0} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        <span className="text-sm font-medium">Memory Usage</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {systemData?.system.memory.percentage || 0}%
                      </span>
                    </div>
                    <Progress value={systemData?.system.memory.percentage || 0} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        <span className="text-sm font-medium">Disk Usage</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {systemData?.system.disk.percentage || 0}%
                      </span>
                    </div>
                    <Progress value={systemData?.system.disk.percentage || 0} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              {/* Network & Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Network & Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4" />
                        <span className="text-sm font-medium">Network Traffic</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Upload className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-xl font-bold text-blue-600">
                          {systemData?.system.network.inbound || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">MB/s In</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <Download className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <div className="text-xl font-bold text-green-600">
                          {systemData?.system.network.outbound || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">MB/s Out</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Error Rate</span>
                      <span className="text-sm text-muted-foreground">
                        {(systemData?.performance.errorRate || 0).toFixed(3)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Availability</span>
                      <span className="text-sm font-medium text-green-600">
                        {systemData?.performance.availability.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">SSL Certificate</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {systemData?.security.ssl.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Expires: {systemData?.security.ssl.expiryDate ? new Date(systemData.security.ssl.expiryDate).toLocaleDateString() : 'N/A'}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Firewall</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {systemData?.security.firewall.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Blocked IPs: {systemData?.security.firewall.blockedIPs || 0}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Vulnerability Scan</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {systemData?.security.vulnerability.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Findings: {systemData?.security.vulnerability.findings || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{alerts.length}</div>
                      <div className="text-sm text-muted-foreground">Active Alerts</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold">SSL</div>
                      <div className="text-sm text-muted-foreground">Valid Certificate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Application Tab */}
          <TabsContent value="application" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Version</div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      <span className="font-mono">{systemData?.application.version || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Uptime</div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{systemData?.application.uptime || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Environment</div>
                    <Badge variant="outline">
                      {systemData?.application.environment || 'production'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                    <div className="text-sm">
                      {systemData?.overall.lastUpdated ? new Date(systemData.overall.lastUpdated).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SelfContainedLayout>
  )
}

export default SystemHealth
