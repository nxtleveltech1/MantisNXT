"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Server,
  Activity,
  Monitor
} from 'lucide-react'

interface HealthData {
  timestamp: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    database: {
      status: string
      responseTime: number
      error?: string
      version?: string
    }
    apis: {
      [key: string]: {
        status: string
        responseTime: number
        error?: string
        dataCount?: number
      }
    }
  }
  system: {
    nodeVersion: string
    platform: string
    uptime: number
    memoryUsage: {
      heapUsed: number
      heapTotal: number
      external: number
      arrayBuffers: number
    }
    totalResponseTime: number
  }
  recommendations: string[]
}

const StatusPage = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/health/frontend')
      const result = await response.json()

      if (result.success) {
        setHealthData(result.data)
        setLastCheck(new Date())
      } else {
        console.error('Health check failed:', result.error)
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthData()

    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60))
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((uptime % (60 * 60)) / 60)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 1000) return 'text-green-600'
    if (responseTime < 3000) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading && !healthData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking system health...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Status</h1>
          <p className="text-muted-foreground">
            Real-time health monitoring for MantisNXT
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-400'}`} />
            Auto-refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button onClick={fetchHealthData} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getStatusIcon(healthData.status)}
              System Status
              {getStatusBadge(healthData.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Last Check</div>
                <div className="text-sm text-muted-foreground">
                  {lastCheck ? lastCheck.toLocaleString() : 'Never'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Response Time</div>
                <div className={`text-sm ${getResponseTimeColor(healthData.system.totalResponseTime)}`}>
                  {healthData.system.totalResponseTime}ms
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">System Uptime</div>
                <div className="text-sm text-muted-foreground">
                  {formatUptime(healthData.system.uptime)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {healthData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Database Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database
                {getStatusBadge(healthData.services.database.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Response Time</div>
                  <div className={`text-sm ${getResponseTimeColor(healthData.services.database.responseTime)}`}>
                    {healthData.services.database.responseTime}ms
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Version</div>
                  <div className="text-sm text-muted-foreground">
                    {healthData.services.database.version || 'Unknown'}
                  </div>
                </div>
              </div>
              {healthData.services.database.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-red-800">Error</div>
                  <div className="text-sm text-red-600">{healthData.services.database.error}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                System Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>{formatBytes(healthData.system.memoryUsage.heapUsed)} / {formatBytes(healthData.system.memoryUsage.heapTotal)}</span>
                  </div>
                  <Progress value={(healthData.system.memoryUsage.heapUsed / healthData.system.memoryUsage.heapTotal) * 100} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Node.js Version</div>
                    <div className="text-muted-foreground">{healthData.system.nodeVersion}</div>
                  </div>
                  <div>
                    <div className="font-medium">Platform</div>
                    <div className="text-muted-foreground">{healthData.system.platform}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Services */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              API Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(healthData.services.apis).map(([name, service]) => (
                <div key={name} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium capitalize">{name}</div>
                    {getStatusIcon(service.status)}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Response Time:</span>
                      <span className={getResponseTimeColor(service.responseTime)}>
                        {service.responseTime}ms
                      </span>
                    </div>
                    {service.dataCount !== undefined && (
                      <div className="flex justify-between">
                        <span>Data Count:</span>
                        <span className="text-muted-foreground">{service.dataCount}</span>
                      </div>
                    )}
                  </div>
                  {service.error && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {service.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {healthData && healthData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {healthData.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1 h-1 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  {recommendation}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StatusPage