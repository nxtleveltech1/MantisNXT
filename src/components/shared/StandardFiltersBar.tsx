'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterOption {
  value: string
  label: string
}

interface StandardFiltersBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: Array<{
    key: string
    label: string
    value: string
    options: FilterOption[]
    onValueChange: (value: string) => void
    className?: string
  }>
  onRefresh?: () => void
  loading?: boolean
  totalItems?: number
  showItemCount?: boolean
  className?: string
}

export function StandardFiltersBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onRefresh,
  loading = false,
  totalItems,
  showItemCount = true,
  className,
}: StandardFiltersBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 mb-4', className)}>
      <Input
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />
      {filters.map((filter) => (
        <Select key={filter.key} value={filter.value} onValueChange={filter.onValueChange}>
          <SelectTrigger className={cn('w-[220px]', filter.className)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {onRefresh && (
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      )}
      {showItemCount && totalItems !== undefined && (
        <div className="ml-auto text-sm text-muted-foreground">
          {totalItems.toLocaleString()} items
        </div>
      )}
    </div>
  )
}

