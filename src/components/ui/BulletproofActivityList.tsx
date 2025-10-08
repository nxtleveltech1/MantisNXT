/**
 * Bulletproof Activity List Component
 * Handles timestamp errors, provides safe sorting, and graceful degradation
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { BulletproofDataLoader, ActivityDataLoader } from '@/components/ui/BulletproofDataLoader'
import { InventoryBoundary } from '@/components/error-boundaries/GranularErrorBoundary'
import { InvalidDateFallback, InvalidNumberFallback } from '@/components/fallbacks/FallbackComponents'
import {
  TimestampValidator,
  NumberValidator,
  StringValidator,
  DataSanitizer,
  SafeSorter
} from '@/utils/dataValidation'
import {
  Clock,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Calendar,
  Hash,
  DollarSign,
  Info
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ActivityItem {
  id: string
  timestamp?: any
  created_at?: any
  updated_at?: any
  type: string
  description: string
  amount?: number
  quantity?: number
  status?: string
  user?: string
  metadata?: Record<string, any>
}

export interface ActivityListProps {
  loadActivities: () => Promise<ActivityItem[]>
  title?: string
  showFilters?: boolean
  showStats?: boolean
  allowExport?: boolean
  maxItems?: number
  autoRefresh?: boolean
  refreshInterval?: number
  onItemClick?: (item: ActivityItem) => void
  className?: string
}

export interface ActivityStats {
  total: number
  validTimestamps: number
  invalidTimestamps: number
  sanitizedItems: number
  dateRange?: {
    earliest: Date
    latest: Date
  }
}

// ============================================================================
// ACTIVITY SANITIZATION
// ============================================================================

function sanitizeActivity(item: any): ActivityItem & { sanitized: boolean; validationErrors: string[] } {
  const validationErrors: string[] = []
  let sanitized = false

  // Sanitize ID
  const idResult = StringValidator.validate(item.id, { fallback: `activity-${Date.now()}-${Math.random()}` })
  if (idResult.sanitized) {
    sanitized = true
    validationErrors.push('Generated fallback ID')
  }

  // Sanitize timestamps
  const timestampResult = TimestampValidator.validate(
    item.timestamp || item.created_at || item.date,
    { fallbackToNow: false, allowNull: true }
  )
  if (timestampResult.sanitized) {
    sanitized = true
  }
  if (timestampResult.errors.length > 0) {
    validationErrors.push(...timestampResult.errors)
  }

  const createdAtResult = TimestampValidator.validate(
    item.created_at,
    { fallbackToNow: false, allowNull: true }
  )

  const updatedAtResult = TimestampValidator.validate(
    item.updated_at,
    { fallbackToNow: false, allowNull: true }
  )

  // Sanitize other fields
  const typeResult = StringValidator.validate(item.type, { fallback: 'general' })
  const descriptionResult = StringValidator.validate(item.description, { fallback: 'No description available' })
  const amountResult = NumberValidator.validate(item.amount, { allowNull: true, decimals: 2 })
  const quantityResult = NumberValidator.validate(item.quantity, { allowNull: true, decimals: 0 })
  const statusResult = StringValidator.validate(item.status, { fallback: 'unknown' })
  const userResult = StringValidator.validate(item.user, { allowNull: true })

  if (typeResult.sanitized || descriptionResult.sanitized ||
      amountResult.sanitized || quantityResult.sanitized || statusResult.sanitized) {
    sanitized = true
  }

  return {
    id: idResult.data!,
    timestamp: timestampResult.data,
    created_at: createdAtResult.data,
    updated_at: updatedAtResult.data,
    type: typeResult.data!,
    description: descriptionResult.data!,
    amount: amountResult.data,
    quantity: quantityResult.data,
    status: statusResult.data!,
    user: userResult.data,
    metadata: item.metadata || {},
    sanitized,
    validationErrors
  }
}

// ============================================================================
// ACTIVITY STATS CALCULATOR
// ============================================================================

function calculateActivityStats(activities: (ActivityItem & { sanitized: boolean })[]): ActivityStats {
  let validTimestamps = 0
  let invalidTimestamps = 0
  let sanitizedItems = 0
  let earliest: Date | null = null
  let latest: Date | null = null

  activities.forEach(activity => {
    if (activity.sanitized) sanitizedItems++

    const timestamp = activity.timestamp || activity.created_at
    if (timestamp && TimestampValidator.validate(timestamp).isValid) {
      validTimestamps++

      const date = TimestampValidator.validate(timestamp).data!
      if (!earliest || date < earliest) earliest = date
      if (!latest || date > latest) latest = date
    } else {
      invalidTimestamps++
    }
  })

  return {
    total: activities.length,
    validTimestamps,
    invalidTimestamps,
    sanitizedItems,
    dateRange: earliest && latest ? { earliest, latest } : undefined
  }
}

// ============================================================================
// SAFE ACTIVITY FORMATTER
// ============================================================================

const ActivityFormatter = {
  timestamp: (value: any, fallback: string = 'Invalid Date'): string => {
    const result = TimestampValidator.validate(value)
    if (!result.isValid || !result.data) return fallback

    try {
      return format(result.data, 'MMM dd, yyyy HH:mm')
    } catch {
      return fallback
    }
  },

  relativeTime: (value: any, fallback: string = 'Unknown time'): string => {
    const result = TimestampValidator.validate(value)
    if (!result.isValid || !result.data) return fallback

    try {
      return formatDistanceToNow(result.data, { addSuffix: true })
    } catch {
      return fallback
    }
  },

  amount: (value: any, fallback: string = '—'): string => {
    const result = NumberValidator.validate(value, { allowNull: true })
    if (!result.isValid || result.data === null) return fallback

    return NumberValidator.formatSafe(result.data, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    })
  },

  quantity: (value: any, fallback: string = '—'): string => {
    const result = NumberValidator.validate(value, { allowNull: true })
    if (!result.isValid || result.data === null) return fallback

    return NumberValidator.formatSafe(result.data, {
      style: 'decimal',
      maximumFractionDigits: 0
    })
  }
}

// ============================================================================
// ACTIVITY STATUS INDICATOR
// ============================================================================

const ActivityStatusIndicator: React.FC<{
  activity: ActivityItem & { sanitized: boolean; validationErrors: string[] }
}> = ({ activity }) => {
  const hasTimestampIssues = !activity.timestamp && !activity.created_at
  const hasValidationErrors = activity.validationErrors.length > 0

  if (hasTimestampIssues || hasValidationErrors) {
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3 text-yellow-500" />
        <Badge variant="outline" className="text-xs">
          Issues: {activity.validationErrors.length}
        </Badge>
      </div>
    )
  }

  if (activity.sanitized) {
    return (
      <div className="flex items-center gap-1">
        <Info className="h-3 w-3 text-blue-500" />
        <Badge variant="outline" className="text-xs bg-blue-50">
          Sanitized
        </Badge>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <CheckCircle className="h-3 w-3 text-green-500" />
      <Badge variant="outline" className="text-xs bg-green-50">
        Valid
      </Badge>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const BulletproofActivityList: React.FC<ActivityListProps> = ({
  loadActivities,
  title = 'Recent Activity',
  showFilters = true,
  showStats = true,
  allowExport = false,
  maxItems = 100,
  autoRefresh = false,
  refreshInterval = 30000,
  onItemClick,
  className = ''
}) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortField, setSortField] = useState<'timestamp' | 'type' | 'amount'>('timestamp')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showValidationIssues, setShowValidationIssues] = useState(false)
  const [showSanitized, setShowSanitized] = useState(true)

  // Handle sorting change
  const handleSort = useCallback((field: 'timestamp' | 'type' | 'amount') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }, [sortField])

  // Render sort button
  const SortButton: React.FC<{ field: 'timestamp' | 'type' | 'amount'; children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-8 px-2 font-medium"
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
  )

  return (
    <InventoryBoundary className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValidationIssues(!showValidationIssues)}
              >
                {showValidationIssues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Issues
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <ActivityDataLoader
            loadData={loadActivities}
            enableCaching={true}
            cacheKey="activity-list"
            cacheDuration={60000} // 1 minute
            autoRefresh={autoRefresh}
            refreshInterval={refreshInterval}
            errorTitle="Activity Loading Error"
            className="space-y-4"
          >
            {(activities) => {
              // Sanitize all activities
              const sanitizedActivities = activities.map(sanitizeActivity)

              // Calculate stats
              const stats = calculateActivityStats(sanitizedActivities)

              // Filter activities
              const filteredActivities = useMemo(() => {
                let filtered = sanitizedActivities

                // Search filter
                if (searchTerm) {
                  const term = searchTerm.toLowerCase()
                  filtered = filtered.filter(activity =>
                    activity.description.toLowerCase().includes(term) ||
                    activity.type.toLowerCase().includes(term) ||
                    activity.user?.toLowerCase().includes(term)
                  )
                }

                // Type filter
                if (filterType !== 'all') {
                  filtered = filtered.filter(activity => activity.type === filterType)
                }

                // Status filter
                if (filterStatus !== 'all') {
                  filtered = filtered.filter(activity => activity.status === filterStatus)
                }

                // Validation issues filter
                if (showValidationIssues) {
                  filtered = filtered.filter(activity =>
                    activity.validationErrors.length > 0 || !activity.timestamp
                  )
                }

                // Sanitized filter
                if (!showSanitized) {
                  filtered = filtered.filter(activity => !activity.sanitized)
                }

                // Sort activities safely
                switch (sortField) {
                  case 'timestamp':
                    return SafeSorter.byTimestamp(
                      filtered,
                      (item) => item.timestamp || item.created_at,
                      sortDirection
                    )
                  case 'type':
                    return SafeSorter.byString(filtered, (item) => item.type, sortDirection)
                  case 'amount':
                    return SafeSorter.byNumber(filtered, (item) => item.amount, sortDirection)
                  default:
                    return filtered
                }
              }, [sanitizedActivities, searchTerm, filterType, filterStatus, showValidationIssues, showSanitized, sortField, sortDirection])

              // Get unique types and statuses for filters
              const uniqueTypes = [...new Set(sanitizedActivities.map(a => a.type))]
              const uniqueStatuses = [...new Set(sanitizedActivities.map(a => a.status))]

              return (
                <div className="space-y-4">
                  {/* Stats Display */}
                  {showStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="p-3">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-sm font-medium">Total</div>
                            <div className="text-lg font-bold">{stats.total}</div>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-sm font-medium">Valid</div>
                            <div className="text-lg font-bold">{stats.validTimestamps}</div>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-3">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <div>
                            <div className="text-sm font-medium">Invalid</div>
                            <div className="text-lg font-bold">{stats.invalidTimestamps}</div>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-3">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-sm font-medium">Sanitized</div>
                            <div className="text-lg font-bold">{stats.sanitizedItems}</div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Filters */}
                  {showFilters && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search activities..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-64"
                        />
                      </div>

                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {uniqueTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {uniqueStatuses.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Sorting Controls */}
                  <div className="flex items-center gap-2 border-b pb-2">
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <SortButton field="timestamp">
                      <Clock className="mr-1 h-3 w-3" />
                      Time
                    </SortButton>
                    <SortButton field="type">
                      <Package className="mr-1 h-3 w-3" />
                      Type
                    </SortButton>
                    <SortButton field="amount">
                      <DollarSign className="mr-1 h-3 w-3" />
                      Amount
                    </SortButton>
                  </div>

                  {/* Activity List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredActivities.slice(0, maxItems).map((activity) => (
                      <Card
                        key={activity.id}
                        className={`p-3 transition-colors hover:bg-muted/50 ${
                          onItemClick ? 'cursor-pointer' : ''
                        } ${activity.sanitized ? 'border-blue-200' : ''}`}
                        onClick={() => onItemClick?.(activity)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {activity.type}
                              </Badge>
                              <Badge
                                variant={activity.status === 'success' ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {activity.status}
                              </Badge>
                              <ActivityStatusIndicator activity={activity} />
                            </div>

                            <p className="text-sm font-medium mb-1 truncate">
                              {activity.description}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {activity.timestamp || activity.created_at ? (
                                  <>
                                    <span>
                                      {ActivityFormatter.timestamp(activity.timestamp || activity.created_at)}
                                    </span>
                                    <span className="text-xs opacity-60">
                                      ({ActivityFormatter.relativeTime(activity.timestamp || activity.created_at)})
                                    </span>
                                  </>
                                ) : (
                                  <InvalidDateFallback originalValue="No timestamp" />
                                )}
                              </div>

                              {activity.amount !== null && activity.amount !== undefined && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span>{ActivityFormatter.amount(activity.amount)}</span>
                                </div>
                              )}

                              {activity.quantity !== null && activity.quantity !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  <span>{ActivityFormatter.quantity(activity.quantity)}</span>
                                </div>
                              )}

                              {activity.user && (
                                <span>by {activity.user}</span>
                              )}
                            </div>

                            {/* Show validation errors if any */}
                            {activity.validationErrors.length > 0 && (
                              <Alert className="mt-2 border-yellow-200 bg-yellow-50">
                                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                                <AlertDescription className="text-xs text-yellow-800">
                                  <strong>Data Issues:</strong> {activity.validationErrors.join(', ')}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}

                    {filteredActivities.length === 0 && (
                      <Card className="p-8 text-center">
                        <div className="text-muted-foreground">
                          {searchTerm || filterType !== 'all' || filterStatus !== 'all' ? (
                            <div>
                              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No activities match your current filters.</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  setSearchTerm('')
                                  setFilterType('all')
                                  setFilterStatus('all')
                                }}
                              >
                                Clear Filters
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No activities found.</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {filteredActivities.length > maxItems && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Showing {maxItems} of {filteredActivities.length} activities.
                          Use filters to narrow down results.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )
            }}
          </ActivityDataLoader>
        </CardContent>
      </Card>
    </InventoryBoundary>
  )
}

export default BulletproofActivityList