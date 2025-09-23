import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  SupplierStore,
  Supplier,
  SupplierAnalytics,
  SupplierFilters,
  SupplierFormData
} from '@/lib/types/inventory'

const initialFilters: SupplierFilters = {
  search: '',
  preferred_only: false
}

export const useSupplierStore = create<SupplierStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      suppliers: [],
      analytics: null,
      filters: initialFilters,
      loading: false,
      error: null,

      // Actions
      fetchSuppliers: async () => {
        set({ loading: true, error: null })
        try {
          const { filters } = get()
          const params = new URLSearchParams()

          // Build query parameters from filters
          if (filters.search) params.append('search', filters.search)
          if (filters.status?.length) params.append('status', filters.status.join(','))
          if (filters.performance_tier?.length) params.append('performance_tier', filters.performance_tier.join(','))
          if (filters.category?.length) params.append('category', filters.category.join(','))
          if (filters.region?.length) params.append('region', filters.region.join(','))
          if (filters.bee_level?.length) params.append('bee_level', filters.bee_level.join(','))
          if (filters.preferred_only) params.append('preferred_only', 'true')
          if (filters.min_spend) params.append('min_spend', filters.min_spend.toString())
          if (filters.max_spend) params.append('max_spend', filters.max_spend.toString())

          const response = await fetch(`/api/suppliers?${params.toString()}`)
          if (!response.ok) throw new Error('Failed to fetch suppliers')

          const data = await response.json()
          set({ suppliers: data.data, loading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      fetchAnalytics: async () => {
        set({ loading: true, error: null })
        try {
          const response = await fetch('/api/suppliers/analytics')
          if (!response.ok) throw new Error('Failed to fetch supplier analytics')

          const data = await response.json()
          set({ analytics: data.data, loading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      setFilters: (newFilters: Partial<SupplierFilters>) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        }))
        // Automatically refetch suppliers when filters change
        get().fetchSuppliers()
      },

      clearFilters: () => {
        set({ filters: initialFilters })
        get().fetchSuppliers()
      },

      addSupplier: async (supplierData: SupplierFormData) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supplierData)
          })

          if (!response.ok) throw new Error('Failed to add supplier')

          const data = await response.json()
          set((state) => ({
            suppliers: [...state.suppliers, data.data],
            loading: false
          }))

          // Refresh analytics
          get().fetchAnalytics()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      updateSupplier: async (id: string, supplierData: Partial<SupplierFormData>) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch(`/api/suppliers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supplierData)
          })

          if (!response.ok) throw new Error('Failed to update supplier')

          const data = await response.json()
          set((state) => ({
            suppliers: state.suppliers.map(s => s.id === id ? data.data : s),
            loading: false
          }))

          // Refresh analytics
          get().fetchAnalytics()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      deleteSupplier: async (id: string) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch(`/api/suppliers/${id}`, {
            method: 'DELETE'
          })

          if (!response.ok) throw new Error('Failed to delete supplier')

          set((state) => ({
            suppliers: state.suppliers.filter(s => s.id !== id),
            loading: false
          }))

          // Refresh analytics
          get().fetchAnalytics()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'supplier-store',
      partialize: (state) => ({
        filters: state.filters
      })
    }
  )
)