/**
 * Fallback UI Components
 * Safe UI components to display when data is malformed or unavailable
 */

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  Wifi,
  Server,
  Clock,
  FileX,
  Search,
  Filter,
  TrendingUp,
  Inbox,
  Eye,
  Settings
} from 'lucide-react'

// ============================================================================
// DATA LOADING FALLBACKS
// ============================================================================

export const LoadingSkeleton: React.FC<{
  type: 'table' | 'chart' | 'card' | 'list'
  count?: number
  className?: string
}> = ({ type, count = 3, className = '' }) => {
  const renderTableSkeleton = () => (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )

  const renderChartSkeleton = () => (
    <div className={`space-y-4 ${className}`}>
      <Skeleton className="h-6 w-32" />
      <div className="flex items-end space-x-2 h-48">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className={`w-8 h-${Math.floor(Math.random() * 40) + 10}`}
          />
        ))}
      </div>
    </div>
  )

  const renderCardSkeleton = () => (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  )

  const renderListSkeleton = () => (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )

  switch (type) {
    case 'table': return renderTableSkeleton()
    case 'chart': return renderChartSkeleton()
    case 'card': return renderCardSkeleton()
    case 'list': return renderListSkeleton()
    default: return renderCardSkeleton()
  }
}

// ============================================================================
// EMPTY STATE FALLBACKS
// ============================================================================

export const EmptyState: React.FC<{
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost'
  }
  className?: string
}> = ({ icon, title, description, action, className = '' }) => (
  <Card className={`border-dashed ${className}`}>
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 p-3 bg-muted rounded-full">
        {icon || <Inbox className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'default'}
        >
          {action.label}
        </Button>
      )}
    </CardContent>
  </Card>
)

export const NoDataFound: React.FC<{
  type?: 'inventory' | 'suppliers' | 'orders' | 'analytics'
  onRefresh?: () => void
  className?: string
}> = ({ type = 'inventory', onRefresh, className = '' }) => {
  const configs = {
    inventory: {
      icon: <Package className="h-8 w-8 text-muted-foreground" />,
      title: 'No inventory items found',
      description: 'Start by adding your first inventory item or check your filters.'
    },
    suppliers: {
      icon: <Users className="h-8 w-8 text-muted-foreground" />,
      title: 'No suppliers found',
      description: 'Add suppliers to start managing your vendor relationships.'
    },
    orders: {
      icon: <ShoppingCart className="h-8 w-8 text-muted-foreground" />,
      title: 'No orders found',
      description: 'Create your first purchase order to get started.'
    },
    analytics: {
      icon: <BarChart3 className="h-8 w-8 text-muted-foreground" />,
      title: 'No data available',
      description: 'Analytics will appear here once you have transaction data.'
    }
  }

  const config = configs[type]

  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      action={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh,
        variant: 'outline'
      } : undefined}
      className={className}
    />
  )
}

// ============================================================================
// ERROR FALLBACKS
// ============================================================================

export const DataError: React.FC<{
  title?: string
  message?: string
  onRetry?: () => void
  onRefresh?: () => void
  className?: string
}> = ({
  title = 'Data Error',
  message = 'Unable to load data. Please try again.',
  onRetry,
  onRefresh,
  className = ''
}) => (
  <Alert className={`border-red-200 bg-red-50 ${className}`}>
    <AlertTriangle className="h-4 w-4 text-red-600" />
    <AlertDescription className="text-red-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium mb-1">{title}</div>
          <div className="text-sm opacity-80">{message}</div>
        </div>
        <div className="flex gap-2 ml-4">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </div>
    </AlertDescription>
  </Alert>
)

export const NetworkError: React.FC<{
  onRetry?: () => void
  className?: string
}> = ({ onRetry, className = '' }) => (
  <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
    <Wifi className="h-4 w-4 text-orange-600" />
    <AlertDescription className="text-orange-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium mb-1">Connection Error</div>
          <div className="text-sm opacity-80">
            Check your internet connection and try again.
          </div>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </AlertDescription>
  </Alert>
)

export const ServerError: React.FC<{
  errorCode?: string | number
  onRetry?: () => void
  className?: string
}> = ({ errorCode, onRetry, className = '' }) => (
  <Alert className={`border-red-200 bg-red-50 ${className}`}>
    <Server className="h-4 w-4 text-red-600" />
    <AlertDescription className="text-red-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium mb-1">
            Server Error {errorCode && `(${errorCode})`}
          </div>
          <div className="text-sm opacity-80">
            The server encountered an error. Please try again later.
          </div>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </AlertDescription>
  </Alert>
)

// ============================================================================
// SPECIALIZED FALLBACKS
// ============================================================================

export const InvalidDateFallback: React.FC<{
  originalValue?: unknown
  className?: string
}> = ({ originalValue, className = '' }) => (
  <Badge variant="secondary" className={`font-mono text-xs ${className}`}>
    <Clock className="h-3 w-3 mr-1" />
    Invalid Date
    {originalValue && (
      <span className="ml-1 opacity-60">({String(originalValue).slice(0, 10)})</span>
    )}
  </Badge>
)

export const InvalidNumberFallback: React.FC<{
  originalValue?: unknown
  fallbackValue?: number | string
  className?: string
}> = ({ originalValue, fallbackValue = 0, className = '' }) => (
  <Badge variant="outline" className={`font-mono text-xs ${className}`}>
    {fallbackValue}
    {originalValue && (
      <span className="ml-1 opacity-60 line-through">
        ({String(originalValue).slice(0, 8)})
      </span>
    )}
  </Badge>
)

export const MissingImageFallback: React.FC<{
  alt?: string
  className?: string
}> = ({ alt = 'Image', className = '' }) => (
  <div className={`bg-muted flex items-center justify-center ${className}`}>
    <div className="text-center p-4">
      <FileX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-xs text-muted-foreground">{alt}</p>
    </div>
  </div>
)

// ============================================================================
// TABLE SPECIFIC FALLBACKS
// ============================================================================

export const TableEmpty: React.FC<{
  type?: string
  hasFilters?: boolean
  onClearFilters?: () => void
  onRefresh?: () => void
  className?: string
}> = ({ type = 'items', hasFilters, onClearFilters, onRefresh, className = '' }) => (
  <div className={`text-center py-12 ${className}`}>
    <div className="mb-4">
      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-medium text-lg mb-2">
        No {type} found
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        {hasFilters
          ? `No ${type} match your current filters. Try adjusting your search criteria.`
          : `No ${type} available. They will appear here once added.`
        }
      </p>
    </div>
    <div className="flex gap-2 justify-center">
      {hasFilters && onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          <Filter className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
      {onRefresh && (
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      )}
    </div>
  </div>
)

// ============================================================================
// CHART FALLBACKS
// ============================================================================

export const ChartNoData: React.FC<{
  title?: string
  description?: string
  onRefresh?: () => void
  className?: string
}> = ({
  title = 'No chart data',
  description = 'Data will appear here once available',
  onRefresh,
  className = ''
}) => (
  <div className={`text-center py-8 ${className}`}>
    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
    <h3 className="font-medium mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground mb-4">{description}</p>
    {onRefresh && (
      <Button size="sm" variant="outline" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh Data
      </Button>
    )}
  </div>
)

// ============================================================================
// PERMISSION FALLBACKS
// ============================================================================

export const AccessDenied: React.FC<{
  message?: string
  className?: string
}> = ({
  message = 'You do not have permission to view this content',
  className = ''
}) => (
  <Alert className={`border-yellow-200 bg-yellow-50 ${className}`}>
    <Eye className="h-4 w-4 text-yellow-600" />
    <AlertDescription className="text-yellow-800">
      <div className="font-medium mb-1">Access Denied</div>
      <div className="text-sm opacity-80">{message}</div>
    </AlertDescription>
  </Alert>
)

// ============================================================================
// MAINTENANCE FALLBACKS
// ============================================================================

export const MaintenanceMode: React.FC<{
  estimatedTime?: string
  className?: string
}> = ({ estimatedTime, className = '' }) => (
  <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
    <Settings className="h-4 w-4 text-blue-600" />
    <AlertDescription className="text-blue-800">
      <div className="font-medium mb-1">Maintenance Mode</div>
      <div className="text-sm opacity-80">
        This feature is temporarily unavailable for maintenance.
        {estimatedTime && ` Estimated completion: ${estimatedTime}`}
      </div>
    </AlertDescription>
  </Alert>
)

export default {
  LoadingSkeleton,
  EmptyState,
  NoDataFound,
  DataError,
  NetworkError,
  ServerError,
  InvalidDateFallback,
  InvalidNumberFallback,
  MissingImageFallback,
  TableEmpty,
  ChartNoData,
  AccessDenied,
  MaintenanceMode
}