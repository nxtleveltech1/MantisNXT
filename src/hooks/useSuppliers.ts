// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import type { Supplier, SupplierSearchFilters, DashboardMetrics } from '@/types/supplier'

// Simple interface that matches our actual API response
interface DatabaseSupplier {
  id: string
  name: string
  supplier_code?: string
  company_name?: string
  status: string
  performance_tier: string
  primary_category?: string
  website?: string
  email?: string
  phone?: string
  contact_person?: string
  address?: string
  tax_id?: string
  payment_terms?: string
  preferred_supplier: boolean
  spend_last_12_months: string
  rating: string
  created_at: string
  updated_at: string
}

interface UseSupplierOptions {
  filters?: SupplierSearchFilters
  autoFetch?: boolean
}

interface APIResponse<T> {
  success: boolean
  data: T
  error?: string
  message?: string
  count?: number
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function useSuppliers(options: UseSupplierOptions = {}) {
  const { filters, autoFetch = true } = options

  const [suppliers, setSuppliers] = useState<DatabaseSupplier[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuppliers = useCallback(async (searchFilters?: SupplierSearchFilters) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      const filtersToUse = searchFilters || filters

      if (filtersToUse?.query) params.append('search', filtersToUse.query)
      if (filtersToUse?.status) params.append('status', filtersToUse.status.join(','))
      if (filtersToUse?.tier) params.append('performance_tier', filtersToUse.tier.join(','))
      if (filtersToUse?.category) params.append('category', filtersToUse.category.join(','))
      if (filtersToUse?.location) params.append('region', filtersToUse.location.join(','))
      if (filtersToUse?.hasActiveContracts !== undefined) {
        params.append('preferred_only', filtersToUse.hasActiveContracts.toString())
      }

      const url = `/api/suppliers?${params.toString()}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: APIResponse<DatabaseSupplier[]> = await response.json()

      if (result.success) {
        setSuppliers(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch suppliers')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch suppliers'
      setError(errorMessage)
      console.error('Error fetching suppliers:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const createSupplier = useCallback(async (supplierData: any) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supplierData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: APIResponse<Supplier> = await response.json()

      if (result.success) {
        setSuppliers(prev => [result.data, ...prev])
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create supplier')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create supplier'
      setError(errorMessage)
      console.error('Error creating supplier:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSupplier = useCallback(async (id: string, supplierData: Partial<any>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supplierData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: APIResponse<Supplier> = await response.json()

      if (result.success) {
        setSuppliers(prev => prev.map(supplier =>
          supplier.id === id ? result.data : supplier
        ))
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update supplier')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update supplier'
      setError(errorMessage)
      console.error('Error updating supplier:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSupplier = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: APIResponse<void> = await response.json()

      if (result.success) {
        // Immediately remove from local state
        setSuppliers(prev => prev.filter(supplier => supplier.id !== id))
        console.log('✅ Supplier removed from local state:', id)
        return true
      } else {
        throw new Error(result.error || 'Failed to delete supplier')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete supplier'
      setError(errorMessage)
      console.error('Error deleting supplier:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchSuppliers()
    }
  }, [fetchSuppliers, autoFetch])

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refresh: () => fetchSuppliers(),
  }
}

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/suppliers/metrics')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: APIResponse<DashboardMetrics> = await response.json()

      if (result.success) {
        setMetrics(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch metrics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics'
      setError(errorMessage)
      console.error('Error fetching metrics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  }
}

// Hook for individual supplier
export function useSupplier(id: string | null) {
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSupplier = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/suppliers/${id}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: APIResponse<Supplier> = await response.json()

      if (result.success) {
        setSupplier(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch supplier')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch supplier'
      setError(errorMessage)
      console.error('Error fetching supplier:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSupplier()
  }, [fetchSupplier])

  return {
    supplier,
    loading,
    error,
    refresh: fetchSupplier,
  }
}