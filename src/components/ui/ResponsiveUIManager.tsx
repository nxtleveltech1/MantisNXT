/**
 * Responsive UI Manager
 * Ensures UI remains responsive and usable during backend issues
 */

// @ts-nocheck
'use client'

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Wifi,
  WifiOff,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Gauge,
  Activity,
  Settings,
  RefreshCw,
  Pause,
  Play,
  X
} from 'lucide-react'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PerformanceMetrics {
  apiLatency: number
  renderTime: number
  memoryUsage: number
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'
  backendHealth: 'healthy' | 'degraded' | 'down'
  lastUpdate: Date
}

interface UIState {
  isResponsive: boolean
  showOfflineMode: boolean
  enableOptimizations: boolean
  degradeAnimations: boolean
  limitConcurrentRequests: boolean
  maxConcurrentRequests: number
  currentLoad: number
}

interface ResponsiveUIContextValue {
  metrics: PerformanceMetrics
  uiState: UIState
  updateMetrics: (metrics: Partial<PerformanceMetrics>) => void
  toggleOfflineMode: () => void
  toggleOptimizations: () => void
  isPending: (operation: string) => boolean
  startOperation: (operation: string) => void
  endOperation: (operation: string) => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const ResponsiveUIContext = createContext<ResponsiveUIContextValue | null>(null)

export function useResponsiveUI() {
  const context = useContext(ResponsiveUIContext)
  if (!context) {
    throw new Error('useResponsiveUI must be used within ResponsiveUIProvider')
  }
  return context
}

// ============================================================================
// PERFORMANCE MONITOR
// ============================================================================

class PerformanceMonitor {
  private static metrics: PerformanceMetrics = {
    apiLatency: 0,
    renderTime: 0,
    memoryUsage: 0,
    connectionQuality: 'good',
    backendHealth: 'healthy',
    lastUpdate: new Date()
  }

  private static observers = new Set<(metrics: PerformanceMetrics) => void>()

  static getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  static updateMetrics(updates: Partial<PerformanceMetrics>) {
    this.metrics = {
      ...this.metrics,
      ...updates,
      lastUpdate: new Date()
    }
    this.notifyObservers()
  }

  static subscribe(observer: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  private static notifyObservers() {
    this.observers.forEach(observer => observer(this.metrics))
  }

  // Measure API latency
  static async measureApiLatency(apiCall: () => Promise<any>): Promise<number> {
    const start = performance.now()
    try {
      await apiCall()
    } catch (error) {
      // Still measure latency even if call fails
    }
    const latency = performance.now() - start

    this.updateMetrics({ apiLatency: latency })
    return latency
  }

  // Measure render time
  static measureRenderTime(callback: () => void): number {
    const start = performance.now()
    callback()
    const renderTime = performance.now() - start

    this.updateMetrics({ renderTime })
    return renderTime
  }

  // Get memory usage (if available)
  static getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit
    }
    return 0
  }

  // Test connection quality
  static async testConnectionQuality(): Promise<void> {
    if (!navigator.onLine) {
      this.updateMetrics({ connectionQuality: 'offline' })
      return
    }

    try {
      const start = performance.now()
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })
      const duration = performance.now() - start

      let quality: PerformanceMetrics['connectionQuality']
      if (response.ok) {
        if (duration < 100) quality = 'excellent'
        else if (duration < 500) quality = 'good'
        else quality = 'poor'
      } else {
        quality = 'poor'
      }

      this.updateMetrics({
        connectionQuality: quality,
        backendHealth: response.ok ? 'healthy' : 'degraded'
      })
    } catch {
      this.updateMetrics({
        connectionQuality: 'poor',
        backendHealth: 'down'
      })
    }
  }

  // Start monitoring
  static startMonitoring(): () => void {
    // Test connection initially
    this.testConnectionQuality()

    // Monitor connection quality every 30 seconds
    const connectionInterval = setInterval(() => {
      this.testConnectionQuality()
    }, 30000)

    // Monitor memory usage every 10 seconds
    const memoryInterval = setInterval(() => {
      const memoryUsage = this.getMemoryUsage()
      if (memoryUsage > 0) {
        this.updateMetrics({ memoryUsage })
      }
    }, 10000)

    // Listen for online/offline events
    const handleOnline = () => this.testConnectionQuality()
    const handleOffline = () => this.updateMetrics({
      connectionQuality: 'offline',
      backendHealth: 'down'
    })

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Return cleanup function
    return () => {
      clearInterval(connectionInterval)
      clearInterval(memoryInterval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }
}

// ============================================================================
// OPERATION TRACKER
// ============================================================================

class OperationTracker {
  private static operations = new Map<string, { startTime: number; priority: 'high' | 'medium' | 'low' }>()
  private static maxConcurrent = 5
  private static observers = new Set<(count: number) => void>()

  static isPending(operation: string): boolean {
    return this.operations.has(operation)
  }

  static getCurrentLoad(): number {
    return this.operations.size
  }

  static canStart(): boolean {
    return this.operations.size < this.maxConcurrent
  }

  static start(operation: string, priority: 'high' | 'medium' | 'low' = 'medium'): boolean {
    if (!this.canStart() && priority !== 'high') {
      return false
    }

    this.operations.set(operation, {
      startTime: performance.now(),
      priority
    })

    this.notifyObservers()
    return true
  }

  static end(operation: string): void {
    const op = this.operations.get(operation)
    if (op) {
      const duration = performance.now() - op.startTime
      console.debug(`Operation "${operation}" completed in ${duration.toFixed(2)}ms`)

      this.operations.delete(operation)
      this.notifyObservers()
    }
  }

  static setMaxConcurrent(max: number): void {
    this.maxConcurrent = max
  }

  static subscribe(observer: (count: number) => void): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  private static notifyObservers(): void {
    this.observers.forEach(observer => observer(this.operations.size))
  }

  static getActiveOperations(): string[] {
    return Array.from(this.operations.keys())
  }
}

// ============================================================================
// RESPONSIVE UI PROVIDER
// ============================================================================

export const ResponsiveUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(() => PerformanceMonitor.getMetrics())
  const [currentLoad, setCurrentLoad] = useState(0)
  const [uiState, setUIState] = useState<UIState>({
    isResponsive: true,
    showOfflineMode: false,
    enableOptimizations: false,
    degradeAnimations: false,
    limitConcurrentRequests: true,
    maxConcurrentRequests: 5,
    currentLoad: 0
  })

  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Start performance monitoring
    cleanupRef.current = PerformanceMonitor.startMonitoring()

    // Subscribe to metrics updates
    const unsubscribeMetrics = PerformanceMonitor.subscribe(setMetrics)

    // Subscribe to operation tracking
    const unsubscribeOperations = OperationTracker.subscribe(setCurrentLoad)

    return () => {
      cleanupRef.current?.()
      unsubscribeMetrics()
      unsubscribeOperations()
    }
  }, [])

  // Auto-adjust UI based on performance
  useEffect(() => {
    const shouldOptimize =
      metrics.connectionQuality === 'poor' ||
      metrics.backendHealth === 'degraded' ||
      metrics.apiLatency > 2000 ||
      metrics.memoryUsage > 0.8

    const shouldShowOffline =
      metrics.connectionQuality === 'offline' ||
      metrics.backendHealth === 'down'

    const shouldDegradeAnimations =
      metrics.renderTime > 16 || // 60fps threshold
      metrics.memoryUsage > 0.9

    setUIState(prev => ({
      ...prev,
      enableOptimizations: shouldOptimize,
      showOfflineMode: shouldShowOffline,
      degradeAnimations: shouldDegradeAnimations,
      currentLoad,
      isResponsive: currentLoad < prev.maxConcurrentRequests
    }))

    // Adjust concurrent request limit based on performance
    if (shouldOptimize) {
      OperationTracker.setMaxConcurrent(Math.max(2, Math.floor(uiState.maxConcurrentRequests * 0.7)))
    } else {
      OperationTracker.setMaxConcurrent(uiState.maxConcurrentRequests)
    }
  }, [metrics, currentLoad, uiState.maxConcurrentRequests])

  const updateMetrics = useCallback((updates: Partial<PerformanceMetrics>) => {
    PerformanceMonitor.updateMetrics(updates)
  }, [])

  const toggleOfflineMode = useCallback(() => {
    setUIState(prev => ({ ...prev, showOfflineMode: !prev.showOfflineMode }))
  }, [])

  const toggleOptimizations = useCallback(() => {
    setUIState(prev => ({ ...prev, enableOptimizations: !prev.enableOptimizations }))
  }, [])

  const isPending = useCallback((operation: string) => {
    return OperationTracker.isPending(operation)
  }, [])

  const startOperation = useCallback((operation: string) => {
    return OperationTracker.start(operation)
  }, [])

  const endOperation = useCallback((operation: string) => {
    OperationTracker.end(operation)
  }, [])

  const contextValue: ResponsiveUIContextValue = {
    metrics,
    uiState,
    updateMetrics,
    toggleOfflineMode,
    toggleOptimizations,
    isPending,
    startOperation,
    endOperation
  }

  return (
    <ResponsiveUIContext.Provider value={contextValue}>
      <div className={`responsive-ui-container ${uiState.degradeAnimations ? 'reduced-motion' : ''}`}>
        {children}
      </div>
    </ResponsiveUIContext.Provider>
  )
}

// ============================================================================
// PERFORMANCE STATUS INDICATOR
// ============================================================================

export const PerformanceStatusIndicator: React.FC<{
  compact?: boolean
  showDetails?: boolean
  className?: string
}> = ({ compact = false, showDetails = false, className = '' }) => {
  const { metrics, uiState } = useResponsiveUI()
  const [isExpanded, setIsExpanded] = useState(false)

  const getConnectionIcon = () => {
    switch (metrics.connectionQuality) {
      case 'excellent':
      case 'good':
        return <Wifi className="h-3 w-3 text-green-500" />
      case 'poor':
        return <Wifi className="h-3 w-3 text-yellow-500" />
      case 'offline':
        return <WifiOff className="h-3 w-3 text-red-500" />
    }
  }

  const getHealthIcon = () => {
    switch (metrics.backendHealth) {
      case 'healthy':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case 'down':
        return <Server className="h-3 w-3 text-red-500" />
    }
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {getConnectionIcon()}
        {getHealthIcon()}
        {uiState.currentLoad > 0 && (
          <Badge variant="outline" className="text-xs">
            {uiState.currentLoad}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardContent className="p-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">System Status</span>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            {getHealthIcon()}
            {isExpanded ? <X className="h-3 w-3" /> : <Settings className="h-3 w-3" />}
          </div>
        </div>

        {(isExpanded || showDetails) && (
          <div className="mt-3 space-y-2">
            {/* Connection Quality */}
            <div className="flex items-center justify-between text-xs">
              <span>Connection:</span>
              <Badge
                variant={
                  metrics.connectionQuality === 'excellent' || metrics.connectionQuality === 'good'
                    ? 'default'
                    : metrics.connectionQuality === 'poor'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {metrics.connectionQuality}
              </Badge>
            </div>

            {/* Backend Health */}
            <div className="flex items-center justify-between text-xs">
              <span>Backend:</span>
              <Badge
                variant={
                  metrics.backendHealth === 'healthy'
                    ? 'default'
                    : metrics.backendHealth === 'degraded'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {metrics.backendHealth}
              </Badge>
            </div>

            {/* API Latency */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>API Latency:</span>
                <span>{Math.round(metrics.apiLatency)}ms</span>
              </div>
              <Progress
                value={Math.min(100, (metrics.apiLatency / 2000) * 100)}
                className="h-1"
              />
            </div>

            {/* Active Operations */}
            <div className="flex items-center justify-between text-xs">
              <span>Active Operations:</span>
              <Badge variant="outline">
                {uiState.currentLoad}/{uiState.maxConcurrentRequests}
              </Badge>
            </div>

            {/* Memory Usage */}
            {metrics.memoryUsage > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Memory:</span>
                  <span>{Math.round(metrics.memoryUsage * 100)}%</span>
                </div>
                <Progress
                  value={metrics.memoryUsage * 100}
                  className="h-1"
                />
              </div>
            )}

            {/* Optimizations Status */}
            {uiState.enableOptimizations && (
              <Alert className="border-blue-200 bg-blue-50">
                <Zap className="h-3 w-3 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  Performance optimizations active
                </AlertDescription>
              </Alert>
            )}

            {/* Offline Mode */}
            {uiState.showOfflineMode && (
              <Alert className="border-orange-200 bg-orange-50">
                <WifiOff className="h-3 w-3 text-orange-600" />
                <AlertDescription className="text-xs text-orange-800">
                  Offline mode active
                </AlertDescription>
              </Alert>
            )}

            {/* Last Update */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last update:</span>
              <span>{metrics.lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// OPERATION MANAGER COMPONENT
// ============================================================================

export const OperationManager: React.FC<{
  children: React.ReactNode
  operationName: string
  priority?: 'high' | 'medium' | 'low'
  fallback?: React.ReactNode
  showProgress?: boolean
}> = ({ children, operationName, priority = 'medium', fallback, showProgress = false }) => {
  const { isPending, startOperation, endOperation, uiState } = useResponsiveUI()
  const [isOperationPending, setIsOperationPending] = useState(false)

  const executeOperation = useCallback(async (operation: () => Promise<any>) => {
    if (!uiState.isResponsive && priority !== 'high') {
      toast.warning('System is busy. Please wait and try again.')
      return
    }

    if (!startOperation(operationName)) {
      toast.warning('Too many operations running. Please wait.')
      return
    }

    setIsOperationPending(true)

    try {
      await operation()
    } finally {
      endOperation(operationName)
      setIsOperationPending(false)
    }
  }, [operationName, priority, startOperation, endOperation, uiState.isResponsive])

  if (isOperationPending && fallback) {
    return <>{fallback}</>
  }

  if (showProgress && isOperationPending) {
    return (
      <div className="flex items-center gap-2 p-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">Processing {operationName}...</span>
      </div>
    )
  }

  return <>{children}</>
}

// ============================================================================
// SMART LOADING WRAPPER
// ============================================================================

export const SmartLoadingWrapper: React.FC<{
  children: React.ReactNode
  fallback?: React.ReactNode
  threshold?: number
}> = ({ children, fallback, threshold = 3 }) => {
  const { uiState } = useResponsiveUI()

  if (uiState.currentLoad >= threshold && fallback) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// ============================================================================
// CSS FOR REDUCED MOTION
// ============================================================================

const reducedMotionStyles = `
  .reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
`

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('reduced-motion-styles')) {
  const style = document.createElement('style')
  style.id = 'reduced-motion-styles'
  style.textContent = reducedMotionStyles
  document.head.appendChild(style)
}

export default ResponsiveUIProvider