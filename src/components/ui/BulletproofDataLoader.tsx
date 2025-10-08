/**
 * Bulletproof Data Loader Component
 * Handles all data loading states with comprehensive error recovery and graceful degradation
 * Specifically designed to handle timestamp errors and backend issues
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingStateManager, MetricLoadingState } from '@/components/dashboard/LoadingStateManager'
import { useErrorRecovery, useApiRetry, useSafeAsync } from '@/hooks/useErrorRecovery'
import {
  LoadingSkeleton,
  DataError,
  NetworkError,
  ServerError,
  InvalidDateFallback,
  InvalidNumberFallback,
  NoDataFound
} from '@/components/fallbacks/FallbackComponents'
import {
  AlertTriangle,
  RefreshCw,
  Loader2,
  Clock,
  Database,
  Wifi,
  Server,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  WifiOff,
  Timer
} from 'lucide-react'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface DataLoaderProps<T> {
  loadData: () => Promise<T>
  children: (data: T) => React.ReactNode

  // Error handling options
  fallbackComponent?: React.ReactNode
  errorBoundary?: boolean

  // Loading customization
  loadingComponent?: React.ReactNode
  loadingType?: 'skeleton' | 'spinner' | 'custom'
  skeletonType?: 'table' | 'chart' | 'card' | 'list'

  // Retry configuration
  enableRetry?: boolean
  maxRetries?: number
  retryDelay?: number

  // Data validation
  validateData?: (data: T) => boolean
  sanitizeData?: (data: T) => T

  // Caching
  enableCaching?: boolean
  cacheKey?: string
  cacheDuration?: number

  // Auto-refresh
  autoRefresh?: boolean
  refreshInterval?: number

  // Callback handlers
  onError?: (error: Error) => void
  onSuccess?: (data: T) => void
  onRetry?: (attempt: number) => void

  // UI customization
  className?: string
  emptyMessage?: string
  errorTitle?: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

class DataCache {
  private static cache = new Map<string, CacheEntry<any>>()

  static set<T>(key: string, data: T, duration: number): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + duration
    })
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  static clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  static getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        expires: entry.expiresAt - Date.now()
      }))
    }
  }
}

// ============================================================================
// DATA SANITIZATION UTILITIES
// ============================================================================

export const DataSanitizers = {
  /**
   * Sanitize timestamp data to handle invalid dates gracefully
   */
  sanitizeTimestamp: (value: any): Date | null => {
    if (!value) return null

    try {
      let date: Date

      if (value instanceof Date) {
        date = value
      } else if (typeof value === 'string') {
        // Handle various string formats
        date = new Date(value)
      } else if (typeof value === 'number') {
        // Handle Unix timestamps (both seconds and milliseconds)
        date = new Date(value > 1e10 ? value : value * 1000)
      } else {
        return null
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null
      }

      // Check if date is reasonable (not too far in past/future)
      const now = new Date()
      const minDate = new Date('1970-01-01')
      const maxDate = new Date(now.getFullYear() + 10, 11, 31)

      if (date < minDate || date > maxDate) {
        return null
      }

      return date
    } catch (error) {
      console.warn('Failed to sanitize timestamp:', value, error)
      return null
    }
  },

  /**
   * Sanitize numeric data to handle invalid numbers gracefully
   */
  sanitizeNumber: (value: any, fallback: number = 0): number => {
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      return value
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.-]/g, ''))
      if (!isNaN(parsed) && isFinite(parsed)) {
        return parsed
      }
    }

    return fallback
  },

  /**
   * Sanitize string data to handle null/undefined gracefully
   */
  sanitizeString: (value: any, fallback: string = ''): string => {
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return fallback
    return String(value)
  },

  /**
   * Sanitize array data to ensure it's always an array
   */
  sanitizeArray: <T>(value: any, fallback: T[] = []): T[] => {
    if (Array.isArray(value)) return value
    if (value === null || value === undefined) return fallback
    return [value]
  },

  /**
   * Comprehensive data sanitizer for common data structures
   */
  sanitizeActivityData: (data: any) => {
    if (!data || typeof data !== 'object') return null

    return {
      ...data,
      id: DataSanitizers.sanitizeString(data.id, `temp-${Date.now()}`),
      timestamp: DataSanitizers.sanitizeTimestamp(data.timestamp),
      created_at: DataSanitizers.sanitizeTimestamp(data.created_at),
      updated_at: DataSanitizers.sanitizeTimestamp(data.updated_at),
      amount: DataSanitizers.sanitizeNumber(data.amount),
      quantity: DataSanitizers.sanitizeNumber(data.quantity),
      price: DataSanitizers.sanitizeNumber(data.price),
      total: DataSanitizers.sanitizeNumber(data.total),
      name: DataSanitizers.sanitizeString(data.name, 'Unnamed Item'),
      description: DataSanitizers.sanitizeString(data.description),
      status: DataSanitizers.sanitizeString(data.status, 'unknown'),
      type: DataSanitizers.sanitizeString(data.type, 'general')
    }
  }
}

// ============================================================================
// CONNECTION STATUS DETECTOR
// ============================================================================

function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => setIsOnline(navigator.onLine)

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Simple connection quality test
    const testConnection = async () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline')
        return
      }

      try {
        const start = Date.now()
        await fetch('/api/health', { method: 'HEAD', cache: 'no-cache' })
        const duration = Date.now() - start

        setConnectionQuality(duration < 1000 ? 'good' : 'poor')
      } catch {
        setConnectionQuality('poor')
      }
    }

    testConnection()
    const interval = setInterval(testConnection, 30000) // Test every 30s

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, connectionQuality }
}

// ============================================================================
// BULLETPROOF DATA LOADER COMPONENT
// ============================================================================

export function BulletproofDataLoader<T>({
  loadData,
  children,
  fallbackComponent,
  errorBoundary = true,
  loadingComponent,
  loadingType = 'skeleton',
  skeletonType = 'card',
  enableRetry = true,
  maxRetries = 3,
  retryDelay = 1000,
  validateData = () => true,
  sanitizeData,
  enableCaching = false,
  cacheKey,
  cacheDuration = 5 * 60 * 1000, // 5 minutes
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
  onError,
  onSuccess,
  onRetry,
  className = '',
  emptyMessage,
  errorTitle = 'Data Loading Error'
}: DataLoaderProps<T>) {
  const { isOnline, connectionQuality } = useConnectionStatus()

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [retryCount, setRetryCount] = useState(0)

  const errorRecovery = useErrorRecovery({
    retryConfig: {
      maxRetries,
      baseDelay: retryDelay,
      maxDelay: retryDelay * 8,
      jitter: true,
      retryCondition: (error: Error, attempt: number) => {
        // Don't retry if offline
        if (!isOnline) return false

        // Always retry network/timeout errors
        if (error.message.includes('fetch') ||
            error.message.includes('timeout') ||
            error.message.includes('network')) {
          return true
        }

        // Retry server errors (5xx)
        if (error.message.includes('5')) return true

        // Retry on first attempt for any error
        return attempt === 1
      }
    },
    onError: (error, attempt) => {
      setRetryCount(attempt)
      onError?.(error)
      onRetry?.(attempt)
    },
    onRetrySuccess: (attempt) => {
      setRetryCount(0)
    },
    showToast: false
  })

  // Load data with full error protection
  const loadDataSafely = useCallback(async (bypassCache = false) => {
    if (!isOnline) {
      throw new Error('No internet connection')
    }

    setIsLoading(true)
    setError(null)

    try {
      // Check cache first
      if (enableCaching && cacheKey && !bypassCache) {
        const cachedData = DataCache.get<T>(cacheKey)
        if (cachedData) {
          setData(cachedData)
          setIsLoading(false)
          setLastRefresh(new Date())
          onSuccess?.(cachedData)
          return cachedData
        }
      }

      // Load fresh data
      const result = await errorRecovery.executeWithRetry(async () => {
        const rawData = await loadData()

        // Validate data
        if (!validateData(rawData)) {
          throw new Error('Data validation failed')
        }

        // Sanitize data if sanitizer provided
        const cleanData = sanitizeData ? sanitizeData(rawData) : rawData

        return cleanData
      })

      // Cache the result
      if (enableCaching && cacheKey) {
        DataCache.set(cacheKey, result, cacheDuration)
      }

      setData(result)
      setError(null)
      setLastRefresh(new Date())
      onSuccess?.(result)

      return result
    } catch (error) {
      const err = error as Error
      setError(err)
      setData(null)
      onError?.(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [
    loadData, enableCaching, cacheKey, cacheDuration, validateData,
    sanitizeData, isOnline, errorRecovery, onSuccess, onError
  ])

  // Initial load
  useEffect(() => {
    loadDataSafely().catch(() => {
      // Error already handled in loadDataSafely
    })
  }, []) // Only run on mount

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !isOnline) return

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadDataSafely().catch(() => {
          // Error already handled
        })
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, isOnline, loadDataSafely])

  // Manual retry function
  const handleRetry = useCallback(() => {
    loadDataSafely(true).catch(() => {
      // Error already handled
    })
  }, [loadDataSafely])

  // Render loading state
  const renderLoading = () => {
    if (loadingComponent) return loadingComponent

    if (loadingType === 'spinner') {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      )
    }

    return <LoadingSkeleton type={skeletonType} />
  }

  // Render error state
  const renderError = () => {
    if (fallbackComponent) return fallbackComponent

    // Offline state
    if (!isOnline) {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">No Internet Connection</div>
                <div className="text-sm opacity-80">
                  Please check your connection and try again.
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleRetry}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    // Network/timeout errors
    if (error?.message.includes('fetch') ||
        error?.message.includes('timeout') ||
        error?.message.includes('network')) {
      return <NetworkError onRetry={enableRetry ? handleRetry : undefined} />
    }

    // Server errors
    if (error?.message.includes('5')) {
      const match = error.message.match(/(\d{3})/)
      const errorCode = match ? match[1] : undefined
      return <ServerError errorCode={errorCode} onRetry={enableRetry ? handleRetry : undefined} />
    }

    // Generic error
    return (
      <DataError
        title={errorTitle}
        message={error?.message || 'An unexpected error occurred'}
        onRetry={enableRetry ? handleRetry : undefined}
      />
    )
  }

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isOnline ? (
        <>
          <div className={`w-2 h-2 rounded-full ${
            connectionQuality === 'good' ? 'bg-green-500' :
            connectionQuality === 'poor' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span>
            {connectionQuality === 'good' ? 'Connected' :
             connectionQuality === 'poor' ? 'Slow connection' : 'Connection issues'}
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 text-red-500" />
          <span>Offline</span>
        </>
      )}
    </div>
  )

  // Retry status indicator
  const RetryStatus = () => {
    if (!errorRecovery.isRetrying && retryCount === 0) return null

    return (
      <div className="flex items-center gap-2 text-xs">
        {errorRecovery.isRetrying && (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Retrying... ({retryCount}/{maxRetries})</span>
          </>
        )}
        {retryCount > 0 && !errorRecovery.isRetrying && (
          <Badge variant="outline" className="text-xs">
            Retried {retryCount}x
          </Badge>
        )}
      </div>
    )
  }

  // Main render logic
  const renderContent = () => {
    if (isLoading && !data) {
      return renderLoading()
    }

    if (error && !data) {
      return renderError()
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return <NoDataFound onRefresh={enableRetry ? handleRetry : undefined} />
    }

    return children(data)
  }

  return (
    <div className={`bulletproof-data-loader ${className}`}>
      {/* Status indicators */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <RetryStatus />
        </div>

        {data && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Timer className="w-3 h-3" />
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Main content */}
      {renderContent()}
    </div>
  )
}

// ============================================================================
// SPECIALIZED DATA LOADERS
// ============================================================================

/**
 * Activity Data Loader with timestamp sanitization
 */
export function ActivityDataLoader<T extends { timestamp?: any; created_at?: any }>({
  children,
  ...props
}: Omit<DataLoaderProps<T[]>, 'sanitizeData'> & {
  children: (data: T[]) => React.ReactNode
}) {
  return (
    <BulletproofDataLoader
      {...props}
      sanitizeData={(data: T[]) => {
        return data.map(item => ({
          ...item,
          timestamp: DataSanitizers.sanitizeTimestamp(item.timestamp),
          created_at: DataSanitizers.sanitizeTimestamp(item.created_at),
          updated_at: DataSanitizers.sanitizeTimestamp((item as any).updated_at)
        }))
      }}
      validateData={(data) => Array.isArray(data)}
      skeletonType="table"
    >
      {children}
    </BulletproofDataLoader>
  )
}

/**
 * Metrics Data Loader with number sanitization
 */
export function MetricsDataLoader<T extends Record<string, any>>({
  children,
  ...props
}: Omit<DataLoaderProps<T>, 'sanitizeData'> & {
  children: (data: T) => React.ReactNode
}) {
  return (
    <BulletproofDataLoader
      {...props}
      sanitizeData={(data: T) => {
        const sanitized = { ...data }

        // Sanitize all numeric fields
        Object.keys(sanitized).forEach(key => {
          if (typeof sanitized[key] === 'number' ||
              (typeof sanitized[key] === 'string' && !isNaN(Number(sanitized[key])))) {
            sanitized[key] = DataSanitizers.sanitizeNumber(sanitized[key])
          }
        })

        return sanitized
      }}
      skeletonType="card"
    >
      {children}
    </BulletproofDataLoader>
  )
}

export default BulletproofDataLoader