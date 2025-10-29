/**
 * System Health Monitor
 * Comprehensive monitoring and auto-recovery system for the entire application
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ResponsiveUIProvider, PerformanceStatusIndicator, useResponsiveUI } from './ResponsiveUIManager'
import { resilientFetch } from '@/utils/resilientApi'
import { toast } from 'sonner'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Gauge,
  Heart,
  RefreshCw,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
  Settings,
  Eye,
  EyeOff,
  Download,
  Upload,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Globe,
  Lock,
  Unlock,
  XCircle,
  CheckSquare,
  AlertCircle,
  Info
} from 'lucide-react'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown'
  database: 'connected' | 'slow' | 'disconnected' | 'error'
  api: 'responsive' | 'slow' | 'timeout' | 'error'
  network: 'excellent' | 'good' | 'poor' | 'offline'
  memory: 'normal' | 'high' | 'critical'
  storage: 'normal' | 'high' | 'full'
  security: 'secure' | 'warning' | 'breach'
  lastCheck: Date
}

interface HealthMetrics {
  responseTime: number
  errorRate: number
  throughput: number
  memoryUsage: number
  storageUsage: number
  activeConnections: number
  uptime: number
  lastError?: Error
}

interface HealthCheck {
  name: string
  url: string
  timeout: number
  criticalThreshold: number
  warningThreshold: number
  enabled: boolean
}

interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: Date
  resolved: boolean
  component: string
}

// ============================================================================
// HEALTH CHECK CONFIGURATIONS
// ============================================================================

const DEFAULT_HEALTH_CHECKS: HealthCheck[] = [
  {
    name: 'Database',
    url: '/api/health',
    timeout: 5000,
    criticalThreshold: 3000,
    warningThreshold: 1000,
    enabled: true
  },
  {
    name: 'API Gateway',
    url: '/api/health',
    timeout: 3000,
    criticalThreshold: 2000,
    warningThreshold: 500,
    enabled: true
  },
  {
    name: 'Authentication',
    url: '/api/auth/health',
    timeout: 3000,
    criticalThreshold: 2000,
    warningThreshold: 800,
    enabled: true
  },
  {
    name: 'File Storage',
    url: '/api/health/storage',
    timeout: 5000,
    criticalThreshold: 4000,
    warningThreshold: 2000,
    enabled: true
  }
]

// ============================================================================
// HEALTH MONITOR CLASS
// ============================================================================

class HealthMonitor {
  private static instance: HealthMonitor
  private healthChecks: HealthCheck[] = DEFAULT_HEALTH_CHECKS
  private status: HealthStatus = {
    overall: 'unknown',
    database: 'disconnected',
    api: 'error',
    network: 'offline',
    memory: 'normal',
    storage: 'normal',
    security: 'secure',
    lastCheck: new Date()
  }
  private metrics: HealthMetrics = {
    responseTime: 0,
    errorRate: 0,
    throughput: 0,
    memoryUsage: 0,
    storageUsage: 0,
    activeConnections: 0,
    uptime: 0
  }
  private alerts: SystemAlert[] = []
  private observers = new Set<(status: HealthStatus, metrics: HealthMetrics, alerts: SystemAlert[]) => void>()
  private checkInterval: NodeJS.Timeout | null = null
  private readonly checkIntervalMs = 30000 // 30 seconds

  static getInstance(): HealthMonitor {
    if (!this.instance) {
      this.instance = new HealthMonitor()
    }
    return this.instance
  }

  subscribe(observer: (status: HealthStatus, metrics: HealthMetrics, alerts: SystemAlert[]) => void): () => void {
    this.observers.add(observer)
    // Immediately send current state
    observer(this.status, this.metrics, this.alerts)
    return () => this.observers.delete(observer)
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => observer(this.status, this.metrics, this.alerts))
  }

  private addAlert(type: SystemAlert['type'], message: string, component: string): void {
    const alert: SystemAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      component
    }

    this.alerts.unshift(alert)

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(0, 50)
    }

    // Show toast for critical alerts
    if (type === 'error') {
      toast.error(`System Alert: ${message}`)
    } else if (type === 'warning') {
      toast.warning(`Warning: ${message}`)
    }
  }

  private async checkEndpoint(check: HealthCheck): Promise<{ status: 'healthy' | 'warning' | 'critical', responseTime: number }> {
    const start = performance.now()

    try {
      const response = await resilientFetch.get(check.url, {
        timeout: check.timeout,
        retries: 1
      })

      const responseTime = performance.now() - start

      if (responseTime > check.criticalThreshold) {
        return { status: 'critical', responseTime }
      } else if (responseTime > check.warningThreshold) {
        return { status: 'warning', responseTime }
      } else {
        return { status: 'healthy', responseTime }
      }
    } catch (error) {
      const responseTime = performance.now() - start
      throw { error, responseTime }
    }
  }

  private async performHealthChecks(): Promise<void> {
    console.log('Performing health checks...')

    const results = await Promise.allSettled(
      this.healthChecks
        .filter(check => check.enabled)
        .map(async (check) => {
          try {
            const result = await this.checkEndpoint(check)
            return { check, ...result, error: null }
          } catch (err: any) {
            return {
              check,
              status: 'critical' as const,
              responseTime: err.responseTime || 0,
              error: err.error
            }
          }
        })
    )

    // Process results
    let databaseStatus: HealthStatus['database'] = 'disconnected'
    let apiStatus: HealthStatus['api'] = 'error'
    let overallStatus: HealthStatus['overall'] = 'healthy'

    let totalResponseTime = 0
    let errorCount = 0
    let totalChecks = 0

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { check, status, responseTime, error } = result.value
        totalResponseTime += responseTime
        totalChecks++

        if (error) {
          errorCount++
          this.addAlert('error', `${check.name} health check failed: ${error.message}`, check.name)
        } else if (status === 'critical') {
          this.addAlert('error', `${check.name} is responding slowly (${Math.round(responseTime)}ms)`, check.name)
          overallStatus = 'critical'
        } else if (status === 'warning') {
          this.addAlert('warning', `${check.name} has elevated response time (${Math.round(responseTime)}ms)`, check.name)
          if (overallStatus === 'healthy') overallStatus = 'warning'
        }

        // Map specific endpoints to status
        switch (check.name) {
          case 'Database':
            databaseStatus = error ? 'error' :
                           status === 'critical' ? 'disconnected' :
                           status === 'warning' ? 'slow' : 'connected'
            break
          case 'API Gateway':
            apiStatus = error ? 'error' :
                       status === 'critical' ? 'timeout' :
                       status === 'warning' ? 'slow' : 'responsive'
            break
        }
      } else {
        errorCount++
        totalChecks++
        overallStatus = 'critical'
      }
    })

    // Check network status
    const networkStatus = navigator.onLine ?
      (totalResponseTime / Math.max(totalChecks, 1) < 500 ? 'excellent' :
       totalResponseTime / Math.max(totalChecks, 1) < 1000 ? 'good' : 'poor') : 'offline'

    // Check memory usage
    let memoryStatus: HealthStatus['memory'] = 'normal'
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit
      if (usage > 0.9) memoryStatus = 'critical'
      else if (usage > 0.7) memoryStatus = 'high'
      this.metrics.memoryUsage = usage
    }

    // Update status
    this.status = {
      overall: overallStatus,
      database: databaseStatus,
      api: apiStatus,
      network: networkStatus,
      memory: memoryStatus,
      storage: 'normal', // TODO: Implement storage check
      security: 'secure', // TODO: Implement security check
      lastCheck: new Date()
    }

    // Update metrics
    this.metrics = {
      ...this.metrics,
      responseTime: totalResponseTime / Math.max(totalChecks, 1),
      errorRate: errorCount / Math.max(totalChecks, 1),
      uptime: this.metrics.uptime + (this.checkIntervalMs / 1000)
    }

    this.notifyObservers()
  }

  start(): void {
    if (this.checkInterval) {
      this.stop()
    }

    // Perform initial check
    this.performHealthChecks()

    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.performHealthChecks()
    }, this.checkIntervalMs)

    console.log('Health monitoring started')
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    console.log('Health monitoring stopped')
  }

  getStatus(): HealthStatus {
    return { ...this.status }
  }

  getMetrics(): HealthMetrics {
    return { ...this.metrics }
  }

  getAlerts(): SystemAlert[] {
    return [...this.alerts]
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      this.notifyObservers()
    }
  }

  clearResolvedAlerts(): void {
    this.alerts = this.alerts.filter(alert => !alert.resolved)
    this.notifyObservers()
  }

  updateHealthChecks(checks: HealthCheck[]): void {
    this.healthChecks = checks
  }

  forceCheck(): void {
    this.performHealthChecks()
  }
}

// ============================================================================
// HEALTH STATUS COMPONENTS
// ============================================================================

const StatusIcon: React.FC<{ status: string; type: 'overall' | 'component' }> = ({ status, type }) => {
  const getIcon = () => {
    switch (status) {
      case 'healthy':
      case 'responsive':
      case 'connected':
      case 'excellent':
      case 'good':
      case 'normal':
      case 'secure':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
      case 'slow':
      case 'poor':
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
      case 'error':
      case 'timeout':
      case 'disconnected':
      case 'offline':
      case 'full':
      case 'breach':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  return getIcon()
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getVariant = () => {
    switch (status) {
      case 'healthy':
      case 'responsive':
      case 'connected':
      case 'excellent':
      case 'good':
      case 'normal':
      case 'secure':
        return 'default'
      case 'warning':
      case 'slow':
      case 'poor':
      case 'high':
        return 'secondary'
      case 'critical':
      case 'error':
      case 'timeout':
      case 'disconnected':
      case 'offline':
      case 'full':
      case 'breach':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <Badge variant={getVariant()}>
      {status}
    </Badge>
  )
}

// ============================================================================
// MAIN SYSTEM HEALTH MONITOR COMPONENT
// ============================================================================

export const SystemHealthMonitor: React.FC<{
  showCompact?: boolean
  autoStart?: boolean
  className?: string
}> = ({ showCompact = false, autoStart = true, className = '' }) => {
  const [status, setStatus] = useState<HealthStatus>(() => HealthMonitor.getInstance().getStatus())
  const [metrics, setMetrics] = useState<HealthMetrics>(() => HealthMonitor.getInstance().getMetrics())
  const [alerts, setAlerts] = useState<SystemAlert[]>(() => HealthMonitor.getInstance().getAlerts())
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const monitorRef = useRef<HealthMonitor>()

  useEffect(() => {
    monitorRef.current = HealthMonitor.getInstance()

    const unsubscribe = monitorRef.current.subscribe((status, metrics, alerts) => {
      setStatus(status)
      setMetrics(metrics)
      setAlerts(alerts)
    })

    if (autoStart) {
      monitorRef.current.start()
    }

    return () => {
      unsubscribe()
      if (autoStart) {
        monitorRef.current?.stop()
      }
    }
  }, [autoStart])

  const handleForceCheck = useCallback(() => {
    monitorRef.current?.forceCheck()
    toast.info('Health check initiated')
  }, [])

  const handleResolveAlert = useCallback((alertId: string) => {
    monitorRef.current?.resolveAlert(alertId)
  }, [])

  const handleClearResolved = useCallback(() => {
    monitorRef.current?.clearResolvedAlerts()
  }, [])

  const unresolvedAlerts = alerts.filter(alert => !alert.resolved)

  if (showCompact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StatusIcon status={status.overall} type="overall" />
        <span className="text-sm font-medium">
          System {status.overall}
        </span>
        {unresolvedAlerts.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {unresolvedAlerts.length}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </div>
    )
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            System Health Monitor
            <StatusIcon status={status.overall} type="overall" />
          </CardTitle>
          <div className="flex items-center gap-2">
            {unresolvedAlerts.length > 0 && (
              <Badge variant="destructive">
                {unresolvedAlerts.length} alerts
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleForceCheck}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Check Now
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Overall Status */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Overall System Status</h3>
                    <p className="text-sm text-muted-foreground">
                      Last checked: {status.lastCheck.toLocaleTimeString()}
                    </p>
                  </div>
                  <StatusBadge status={status.overall} />
                </div>
              </CardContent>
            </Card>

            {/* Component Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">Database</span>
                  </div>
                  <StatusBadge status={status.database} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="h-4 w-4" />
                    <span className="font-medium">API</span>
                  </div>
                  <StatusBadge status={status.api} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {status.network === 'offline' ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                    <span className="font-medium">Network</span>
                  </div>
                  <StatusBadge status={status.network} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MemoryStick className="h-4 w-4" />
                    <span className="font-medium">Memory</span>
                  </div>
                  <StatusBadge status={status.memory} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="h-4 w-4" />
                    <span className="font-medium">Storage</span>
                  </div>
                  <StatusBadge status={status.storage} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {status.security === 'secure' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    <span className="font-medium">Security</span>
                  </div>
                  <StatusBadge status={status.security} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Response Time</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.round(metrics.responseTime)}ms
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Error Rate</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.round(metrics.errorRate * 100)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MemoryStick className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Memory Usage</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.round(metrics.memoryUsage * 100)}%
                  </div>
                  <Progress value={metrics.memoryUsage * 100} className="mt-2 h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Uptime</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.round(metrics.uptime / 60)}m
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">System Alerts</h3>
              <Button variant="outline" size="sm" onClick={handleClearResolved}>
                Clear Resolved
              </Button>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No alerts</p>
                    </CardContent>
                  </Card>
                ) : (
                  alerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      className={`${
                        alert.type === 'error' ? 'border-red-200 bg-red-50' :
                        alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      } ${alert.resolved ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          {alert.type === 'error' ? <XCircle className="h-4 w-4 text-red-600 mt-0.5" /> :
                           alert.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" /> :
                           <Info className="h-4 w-4 text-blue-600 mt-0.5" />}
                          <div>
                            <AlertDescription className={
                              alert.type === 'error' ? 'text-red-800' :
                              alert.type === 'warning' ? 'text-yellow-800' :
                              'text-blue-800'
                            }>
                              <div className="font-medium">{alert.component}</div>
                              <div className="text-sm">{alert.message}</div>
                              <div className="text-xs mt-1">
                                {alert.timestamp.toLocaleString()}
                              </div>
                            </AlertDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {alert.resolved && <CheckSquare className="h-4 w-4 text-green-500" />}
                          {!alert.resolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolveAlert(alert.id)}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-medium">Health Check Configuration</h3>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Health checks run every 30 seconds to monitor system components.
                  Critical alerts are shown as toast notifications.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-check interval:</span>
                  <Badge variant="outline">30 seconds</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Retry attempts:</span>
                  <Badge variant="outline">1</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Timeout:</span>
                  <Badge variant="outline">5 seconds</Badge>
                </div>
              </div>

              <PerformanceStatusIndicator showDetails />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// HEALTH MONITOR PROVIDER
// ============================================================================

export const HealthMonitorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ResponsiveUIProvider>
      {children}
    </ResponsiveUIProvider>
  )
}

export default SystemHealthMonitor