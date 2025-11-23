import { useState, useEffect, useMemo } from 'react'
import type { ColumnDef } from '@/components/catalog/ColumnManagementDialog'

export function useColumnManagement(
  storageKey: string,
  defaultColumns: ColumnDef[]
) {
  // Load columns from localStorage or use defaults
  const loadColumnsFromStorage = (): ColumnDef[] => {
    if (typeof window === 'undefined') return defaultColumns

    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return defaultColumns

      const parsed = JSON.parse(stored) as ColumnDef[]
      const defaultMap = new Map(defaultColumns.map((col) => [col.key, col]))
      const storedMap = new Map(parsed.map((col) => [col.key, col]))

      // Merge, keeping stored values but ensuring all defaults exist
      const merged = defaultColumns.map((defaultCol) => {
        const storedCol = storedMap.get(defaultCol.key)
        return storedCol
          ? { ...defaultCol, ...storedCol, order: storedCol.order ?? defaultCol.order }
          : defaultCol
      })

      return merged.sort((a, b) => a.order - b.order)
    } catch {
      return defaultColumns
    }
  }

  const [columns, setColumns] = useState<ColumnDef[]>(() => loadColumnsFromStorage())

  // Save columns to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(storageKey, JSON.stringify(columns))
    } catch (error) {
      console.error(`Failed to save columns to localStorage (${storageKey}):`, error)
    }
  }, [columns, storageKey])

  // Get visible columns in order
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => col.visible).sort((a, b) => a.order - b.order)
  }, [columns])

  // Check if a column is visible
  const isColumnVisible = (key: string) => {
    return columns.find((col) => col.key === key)?.visible ?? false
  }

  // Reset to defaults
  const resetColumns = () => {
    setColumns(
      defaultColumns.map((col) => ({
        ...col,
      }))
    )
  }

  return {
    columns,
    setColumns,
    visibleColumns,
    isColumnVisible,
    resetColumns,
  }
}

