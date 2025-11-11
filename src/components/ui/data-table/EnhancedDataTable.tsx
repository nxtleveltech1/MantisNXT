// @ts-nocheck
"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  MoreHorizontal,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Loader2,
  Activity,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Enhanced Column Configuration
export interface ColumnDef<T = unknown> {
  id: string
  key: keyof T
  header: string
  description?: string
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'boolean' | 'badge' | 'actions' | 'custom'
  width?: number | 'auto' | 'flex'
  minWidth?: number
  maxWidth?: number
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  resizable?: boolean
  pinnable?: boolean
  hideable?: boolean
  sticky?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  formatter?: (value: unknown, row: T) => React.ReactNode
  accessor?: (row: T) => unknown
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none'
  filterOptions?: Array<{ label: string; value: unknown }>
  validationRules?: Array<{
    rule: (value: unknown) => boolean
    message: string
    severity: 'error' | 'warning' | 'info'
  }>
  metadata?: {
    unit?: string
    precision?: number
    currency?: string
    dateFormat?: string
    icon?: React.ComponentType<unknown>
  }
}

// Enhanced Filter Configuration
export interface FilterState {
  [key: string]: {
    value: unknown
    operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in'
    enabled: boolean
  }
}

// Advanced Sorting Configuration
export interface SortState {
  column: string
  direction: 'asc' | 'desc'
  priority: number
}

// Data Table Props with Enhanced Features
export interface EnhancedDataTableProps<T = unknown> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  error?: string | null

  // Pagination
  pagination?: {
    enabled: boolean
    pageSize: number
    pageSizeOptions: number[]
    showInfo: boolean
    showSizeSelector: boolean
  }

  // Search & Filtering
  globalSearch?: {
    enabled: boolean
    placeholder: string
    debounceMs: number
  }

  // Selection
  selection?: {
    enabled: boolean
    mode: 'single' | 'multiple'
    showSelectAll: boolean
  }

  // Sorting
  sorting?: {
    enabled: boolean
    multiSort: boolean
    defaultSort?: SortState[]
  }

  // Grouping & Aggregation
  grouping?: {
    enabled: boolean
    defaultGroupBy?: string
    showAggregates: boolean
  }

  // Visual Customization
  appearance?: {
    variant: 'default' | 'bordered' | 'striped' | 'minimal'
    size: 'sm' | 'md' | 'lg'
    stickyHeader: boolean
    highlightOnHover: boolean
    alternatingRows: boolean
    showRowNumbers: boolean
    compactMode: boolean
    fullscreen?: boolean
  }

  // Export & Actions
  actions?: {
    export?: {
      enabled: boolean
      formats: ('csv' | 'xlsx' | 'json' | 'pdf')[]
    }
    bulk?: Array<{
      id: string
      label: string
      icon?: React.ComponentType<unknown>
      handler: (selectedRows: T[]) => void
      confirmation?: string
    }>
    row?: Array<{
      id: string
      label: string
      icon?: React.ComponentType<unknown>
      handler: (row: T, index: number) => void
      condition?: (row: T) => boolean
    }>
  }

  // Real-time Features
  realtime?: {
    enabled: boolean
    updateInterval: number
    showLastUpdate: boolean
    highlightChanges: boolean
  }

  // Event Handlers
  onRowClick?: (row: T, index: number) => void
  onRowDoubleClick?: (row: T, index: number) => void
  onSelectionChange?: (selectedRows: T[]) => void
  onSortChange?: (sort: SortState[]) => void
  onFilterChange?: (filters: FilterState) => void
  onColumnResize?: (columnId: string, width: number) => void
  onColumnReorder?: (columnOrder: string[]) => void

  // Accessibility
  accessibilityLabel?: string
  announceChanges?: boolean
  keyboardNavigation?: boolean
}

const EnhancedDataTable = <T extends Record<string, unknown>>({
  data = [],
  columns = [],
  loading = false,
  error = null,
  pagination = { enabled: true, pageSize: 50, pageSizeOptions: [10, 25, 50, 100, 200], showInfo: true, showSizeSelector: true },
  globalSearch = { enabled: true, placeholder: 'Search across all columns...', debounceMs: 300 },
  selection = { enabled: false, mode: 'multiple', showSelectAll: true },
  sorting = { enabled: true, multiSort: true },
  grouping = { enabled: false, showAggregates: true },
  appearance = {
    variant: 'default',
    size: 'md',
    stickyHeader: true,
    highlightOnHover: true,
    alternatingRows: true,
    showRowNumbers: false,
    compactMode: false
  },
  actions,
  realtime = { enabled: false, updateInterval: 30000, showLastUpdate: true, highlightChanges: true },
  onRowClick,
  onRowDoubleClick,
  onSelectionChange,
  onSortChange,
  onFilterChange,
  onColumnResize: _onColumnResize,
  onColumnReorder: _onColumnReorder,
  accessibilityLabel = 'Data table',
  announceChanges = true,
  keyboardNavigation = true
}: EnhancedDataTableProps<T>) => {

  // State Management
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(pagination.pageSize)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [sortStates, setSortStates] = useState<SortState[]>(sorting.defaultSort || [])
  const [filters, setFilters] = useState<FilterState>({})
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set())
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [changedRows, setChangedRows] = useState<Set<number>>(new Set())
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const groupingEnabled = grouping?.enabled ?? false
  const groupingLabel = groupingEnabled
    ? `Grouping by ${grouping.defaultGroupBy ?? 'selected column'}`
    : null
  const liveAnnouncement = announceChanges && realtime.enabled
    ? `Last updated ${lastUpdate.toLocaleTimeString()}`
    : null

  // Refs
  const tableRef = useRef<HTMLDivElement>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout>()

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...data]

    // Apply global search
    if (globalSearch.enabled && searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(row =>
        columns.some(col => {
          if (!col.searchable && col.searchable !== undefined) return false
          const value = col.accessor ? col.accessor(row) : row[col.key]
          return String(value).toLowerCase().includes(query)
        })
      )
    }

    // Apply column filters
    Object.entries(filters).forEach(([columnId, filter]) => {
      if (!filter.enabled) return

      const column = columns.find(col => col.id === columnId)
      if (!column) return

      result = result.filter(row => {
        const value = column.accessor ? column.accessor(row) : row[column.key]

        switch (filter.operator) {
          case 'equals':
            return value === filter.value
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
          case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase())
          case 'ends_with':
            return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase())
          case 'greater_than':
            return Number(value) > Number(filter.value)
          case 'less_than':
            return Number(value) < Number(filter.value)
          case 'between':
            return Array.isArray(filter.value) &&
              Number(value) >= Number(filter.value[0]) &&
              Number(value) <= Number(filter.value[1])
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value)
          case 'not_in':
            return Array.isArray(filter.value) && !filter.value.includes(value)
          default:
            return true
        }
      })
    })

    // Apply sorting
    if (sortStates.length > 0 && sorting.enabled) {
      result.sort((a, b) => {
        for (const sortState of sortStates.sort((a, b) => a.priority - b.priority)) {
          const column = columns.find(col => col.id === sortState.column)
          if (!column) continue

          const aVal = column.accessor ? column.accessor(a) : a[column.key]
          const bVal = column.accessor ? column.accessor(b) : b[column.key]

          let comparison = 0

          if (column.type === 'number' || column.type === 'currency' || column.type === 'percentage') {
            comparison = Number(aVal) - Number(bVal)
          } else if (column.type === 'date') {
            comparison = new Date(aVal).getTime() - new Date(bVal).getTime()
          } else {
            comparison = String(aVal).localeCompare(String(bVal))
          }

          if (comparison !== 0) {
            return sortState.direction === 'desc' ? -comparison : comparison
          }
        }
        return 0
      })
    }

    return result
  }, [data, searchQuery, filters, sortStates, columns, globalSearch.enabled, sorting.enabled])

  // Pagination calculations
  const totalPages = pagination.enabled ? Math.ceil(processedData.length / pageSize) : 1
  const startIndex = pagination.enabled ? (currentPage - 1) * pageSize : 0
  const endIndex = pagination.enabled ? Math.min(startIndex + pageSize, processedData.length) : processedData.length
  const paginatedData = pagination.enabled ? processedData.slice(startIndex, endIndex) : processedData

  // Real-time updates
  useEffect(() => {
    if (!realtime.enabled) return

    const interval = setInterval(() => {
      setLastUpdate(new Date())

      // Simulate data changes for demonstration
      if (realtime.highlightChanges && Math.random() > 0.7) {
        const randomIndex = Math.floor(Math.random() * paginatedData.length)
        setChangedRows(prev => new Set([...prev, randomIndex]))

        // Clear highlight after 3 seconds
        setTimeout(() => {
          setChangedRows(prev => {
            const newSet = new Set(prev)
            newSet.delete(randomIndex)
            return newSet
          })
        }, 3000)
      }
    }, realtime.updateInterval)

    return () => clearInterval(interval)
  }, [realtime.enabled, realtime.updateInterval, realtime.highlightChanges, paginatedData.length])

  // Search debouncing
  const handleSearch = useCallback((value: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value)
      setCurrentPage(1) // Reset to first page when searching
    }, globalSearch.debounceMs)
  }, [globalSearch.debounceMs])

  // Sorting handlers
  const handleSort = useCallback((columnId: string) => {
    if (!sorting.enabled) return

    setSortStates(prev => {
      const existingSort = prev.find(s => s.column === columnId)

      if (existingSort) {
        if (existingSort.direction === 'asc') {
          return prev.map(s => s.column === columnId ? { ...s, direction: 'desc' as const } : s)
        } else {
          return prev.filter(s => s.column !== columnId)
        }
      } else {
        if (sorting.multiSort) {
          return [...prev, { column: columnId, direction: 'asc', priority: prev.length }]
        } else {
          return [{ column: columnId, direction: 'asc', priority: 0 }]
        }
      }
    })
  }, [sorting.enabled, sorting.multiSort])

  // Selection handlers
  const handleRowSelect = useCallback((rowIndex: number, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (selected) {
        if (selection.mode === 'single') {
          newSet.clear()
        }
        newSet.add(rowIndex)
      } else {
        newSet.delete(rowIndex)
      }
      return newSet
    })
  }, [selection.mode])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(paginatedData.map((_, index) => startIndex + index)))
    } else {
      setSelectedRows(new Set())
    }
  }, [paginatedData, startIndex])

  useEffect(() => {
    if (!onSelectionChange) return
    const selectedData = Array.from(selectedRows)
      .map(index => data[index])
      .filter((row): row is T => Boolean(row))
    onSelectionChange(selectedData)
  }, [data, onSelectionChange, selectedRows])

  useEffect(() => {
    if (!onSortChange) return
    onSortChange(sortStates)
  }, [onSortChange, sortStates])

  useEffect(() => {
    if (!onFilterChange) return
    onFilterChange(filters)
  }, [filters, onFilterChange])

  // Format cell values
  const formatCellValue = useCallback((column: ColumnDef<T>, value: unknown, row: T) => {
    if (column.formatter) {
      return column.formatter(value, row)
    }

    switch (column.type) {
      case 'currency': {
        const currency = column.metadata?.currency || 'USD'
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency
        }).format(Number(value) || 0)
      }

      case 'percentage': {
        const precision = column.metadata?.precision || 1
        return `${(Number(value) || 0).toFixed(precision)}%`
      }

      case 'number':
        return (Number(value) || 0).toLocaleString()

      case 'date':
        return new Date(value).toLocaleDateString()

      case 'boolean':
        return (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {value ? 'Yes' : 'No'}
          </Badge>
        )

      case 'badge':
        return <Badge variant="outline">{String(value)}</Badge>

      default:
        return String(value || '')
    }
  }, [])

  // Get column sort state
  const getColumnSortState = useCallback((columnId: string) => {
    return sortStates.find(s => s.column === columnId)
  }, [sortStates])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="p-4 bg-primary-100 rounded-full"
        >
          <Loader2 className="h-8 w-8 text-primary-600" />
        </motion.div>
        <div className="ml-4">
          <div className="text-lg font-semibold">Loading data...</div>
          <div className="text-sm text-muted-foreground">Please wait while we fetch your data</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
        "space-y-4",
        isFullscreen && "fixed inset-0 z-50 bg-white p-6 overflow-auto"
      )}
        role="region"
        aria-label={accessibilityLabel}
      >
        {liveAnnouncement && (
          <span className="sr-only" aria-live="polite">
            {liveAnnouncement}
          </span>
        )}
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4 flex-1">
            {globalSearch.enabled && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={globalSearch.placeholder}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {/* Active Filters Display */}
            <AnimatePresence>
              {Object.entries(filters).some(([_, filter]) => filter.enabled) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center gap-2"
                >
                  {Object.entries(filters)
                    .filter(([_, filter]) => filter.enabled)
                    .map(([columnId, filter]) => {
                      const column = columns.find(col => col.id === columnId)
                      return (
                        <Badge key={columnId} variant="secondary" className="flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {column?.header}: {String(filter.value)}
                          <button
                            onClick={() => setFilters(prev => ({
                              ...prev,
                              [columnId]: { ...prev[columnId], enabled: false }
                            }))}
                            className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    })}
                </motion.div>
              )}
            </AnimatePresence>

            {groupingLabel && (
              <Badge variant="outline" className="text-xs">
                {groupingLabel}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Real-time Status */}
            {realtime.enabled && realtime.showLastUpdate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Activity className="h-4 w-4 text-green-500" />
                </motion.div>
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}

            {/* Bulk Actions */}
            {selection.enabled && selectedRows.size > 0 && actions?.bulk && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedRows.size} selected
                </Badge>
                {actions.bulk.map(action => {
                  const Icon = action.icon || MoreHorizontal
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const rows = Array.from(selectedRows).map(index => processedData[index])
                        action.handler(rows)
                      }}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </Button>
                  )
                })}
              </div>
            )}

            {/* Export */}
            {actions?.export?.enabled && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}

            {/* Column Settings */}
            <Popover open={showColumnSettings} onOpenChange={setShowColumnSettings}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="font-semibold">Manage Columns</div>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {columns.map(column => (
                        <div key={column.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={!hiddenColumns.has(column.id)}
                              onCheckedChange={(checked) => {
                                setHiddenColumns(prev => {
                                  const newSet = new Set(prev)
                                  if (checked) {
                                    newSet.delete(column.id)
                                  } else {
                                    newSet.add(column.id)
                                  }
                                  return newSet
                                })
                              }}
                            />
                            <span className="text-sm">{column.header}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {column.pinnable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPinnedColumns(prev => {
                                    const newSet = new Set(prev)
                                    if (newSet.has(column.id)) {
                                      newSet.delete(column.id)
                                    } else {
                                      newSet.add(column.id)
                                    }
                                    return newSet
                                  })
                                }}
                              >
                                {pinnedColumns.has(column.id) ? (
                                  <PinOff className="h-3 w-3" />
                                ) : (
                                  <Pin className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Table Container */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div
            ref={tableRef}
            className="overflow-auto max-h-[70vh] border border-gray-200 rounded-lg"
          >
            <Table>
              {/* Header */}
              <TableHeader className={cn(
                appearance.stickyHeader && "sticky top-0 z-10 bg-white shadow-sm"
              )}>
                <TableRow className="border-b-2 border-gray-200">
                  {/* Row Number Header */}
                  {appearance.showRowNumbers && (
                    <TableHead className="w-16 text-center font-bold">#</TableHead>
                  )}

                  {/* Select All Header */}
                  {selection.enabled && selection.showSelectAll && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all rows"
                      />
                    </TableHead>
                  )}

                  {/* Column Headers */}
                  {columns
                    .filter(col => !hiddenColumns.has(col.id))
                    .map(column => {
                      const sortState = getColumnSortState(column.id)
                      const isPinned = pinnedColumns.has(column.id)

                      return (
                        <TableHead
                          key={column.id}
                          className={cn(
                            "relative group select-none",
                            column.align === 'center' && "text-center",
                            column.align === 'right' && "text-right",
                            isPinned && "sticky bg-white shadow-sm",
                            column.sticky === 'left' && "left-0",
                            column.sticky === 'right' && "right-0",
                            column.sortable !== false && sorting.enabled && "cursor-pointer hover:bg-gray-50"
                          )}
                          style={{
                            width: column.width,
                            minWidth: column.minWidth,
                            maxWidth: column.maxWidth
                          }}
                          onClick={() => column.sortable !== false && handleSort(column.id)}
                        >
                          <div className="flex items-center gap-2">
                            {column.metadata?.icon && (
                              <column.metadata.icon className="h-4 w-4 text-gray-500" />
                            )}

                            <span className="font-semibold text-gray-700">
                              {column.header}
                            </span>

                            {column.description && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-64">{column.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Sort Indicators */}
                            {column.sortable !== false && sorting.enabled && (
                              <div className="flex flex-col">
                                {sortState ? (
                                  sortState.direction === 'asc' ? (
                                    <SortAsc className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <SortDesc className="h-4 w-4 text-blue-600" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                                {sorting.multiSort && sortState && (
                                  <Badge variant="secondary" className="text-xs h-4 w-4 rounded-full p-0 flex items-center justify-center">
                                    {sortState.priority + 1}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Pin Indicator */}
                            {isPinned && (
                              <Pin className="h-3 w-3 text-gray-500" />
                            )}
                          </div>

                          {/* Column Resizer */}
                          {column.resizable !== false && (
                            <div className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors" />
                          )}
                        </TableHead>
                      )
                    })}

                  {/* Actions Header */}
                  {actions?.row && actions.row.length > 0 && (
                    <TableHead className="w-20 text-center">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              {/* Body */}
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {paginatedData.map((row, index) => {
                    const absoluteIndex = startIndex + index
                    const isSelected = selectedRows.has(absoluteIndex)
                    const isChanged = changedRows.has(index)
                    const isHovered = hoveredRow === index

                    return (
                      <motion.tr
                        key={`row-${absoluteIndex}`}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          backgroundColor: isChanged ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
                        }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        tabIndex={keyboardNavigation ? 0 : -1}
                        aria-selected={selection.enabled ? isSelected : undefined}
                        onKeyDown={(event) => {
                          if (!keyboardNavigation) return
                          if (event.key === 'Enter') {
                            onRowClick?.(row, absoluteIndex)
                          }
                          if (event.key === ' ' && selection.enabled) {
                            event.preventDefault()
                            handleRowSelect(absoluteIndex, !isSelected)
                          }
                        }}
                        className={cn(
                          "group transition-all duration-200 border-b border-gray-100",
                          appearance.alternatingRows && index % 2 === 1 && "bg-gray-50/50",
                          appearance.highlightOnHover && "hover:bg-blue-50/50",
                          isSelected && "bg-blue-100/50 border-blue-200",
                          appearance.compactMode ? "h-8" : "h-12",
                          onRowClick && "cursor-pointer"
                        )}
                        onMouseEnter={() => setHoveredRow(index)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onClick={() => onRowClick?.(row, absoluteIndex)}
                        onDoubleClick={() => onRowDoubleClick?.(row, absoluteIndex)}
                      >
                        {/* Row Numbers */}
                        {appearance.showRowNumbers && (
                          <TableCell className="text-center text-sm text-gray-500 font-mono">
                            {absoluteIndex + 1}
                          </TableCell>
                        )}

                        {/* Row Selection */}
                        {selection.enabled && (
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleRowSelect(absoluteIndex, !!checked)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select row ${absoluteIndex + 1}`}
                            />
                          </TableCell>
                        )}

                        {/* Data Cells */}
                        {columns
                          .filter(col => !hiddenColumns.has(col.id))
                          .map(column => {
                            const value = column.accessor ? column.accessor(row) : row[column.key]
                            const isPinned = pinnedColumns.has(column.id)

                            return (
                              <TableCell
                                key={column.id}
                                className={cn(
                                  "relative",
                                  column.align === 'center' && "text-center",
                                  column.align === 'right' && "text-right",
                                  isPinned && "sticky bg-white shadow-sm",
                                  column.sticky === 'left' && "left-0",
                                  column.sticky === 'right' && "right-0",
                                  appearance.compactMode ? "py-1 px-2" : "py-3 px-4"
                                )}
                                style={{
                                  width: column.width,
                                  minWidth: column.minWidth,
                                  maxWidth: column.maxWidth
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {formatCellValue(column, value, row)}

                                  {/* Validation Indicators */}
                                  {column.validationRules && column.validationRules.some(rule => !rule.rule(value)) && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {column.validationRules
                                          .filter(rule => !rule.rule(value))
                                          .map(rule => (
                                            <p key={rule.message}>{rule.message}</p>
                                          ))
                                        }
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  {/* Change Indicator */}
                                  {isChanged && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-2 h-2 bg-green-500 rounded-full"
                                    />
                                  )}
                                </div>
                              </TableCell>
                            )
                          })}

                        {/* Row Actions */}
                        {actions?.row && actions.row.length > 0 && (
                          <TableCell className="text-center">
                            <div className={cn(
                              "flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                              isHovered && "opacity-100"
                            )}>
                              {actions.row
                                .filter(action => !action.condition || action.condition(row))
                                .map(action => {
                                  const Icon = action.icon || MoreHorizontal
                                  return (
                                    <Button
                                      key={action.id}
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        action.handler(row, absoluteIndex)
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Icon className="h-4 w-4" />
                                    </Button>
                                  )
                                })}
                            </div>
                          </TableCell>
                        )}
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Pagination */}
        {pagination.enabled && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Info */}
            {pagination.showInfo && (
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {endIndex} of {processedData.length} entries
                {processedData.length !== data.length && (
                  <span> (filtered from {data.length} total)</span>
                )}
              </div>
            )}

            {/* Page Size Selector */}
            {pagination.showSizeSelector && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pagination.pageSizeOptions.map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">entries</span>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-10 h-10 p-0"
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default EnhancedDataTable
