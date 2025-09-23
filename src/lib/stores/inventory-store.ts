import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  InventoryStore,
  InventoryItem,
  Product,
  Supplier,
  StockMovement,
  InventoryAnalytics,
  InventoryFilters,
  ProductFormData,
  InventoryAdjustmentFormData
} from '@/lib/types/inventory'

const initialFilters: InventoryFilters = {
  search: '',
  low_stock_only: false,
  out_of_stock_only: false
}

export const useInventoryStore = create<InventoryStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      items: [],
      products: [],
      suppliers: [],
      movements: [],
      analytics: null,
      filters: initialFilters,
      loading: false,
      error: null,

      // Actions
      fetchItems: async () => {
        set({ loading: true, error: null })
        try {
          const { filters } = get()
          const params = new URLSearchParams()

          // Build query parameters from filters
          if (filters.search) params.append('search', filters.search)
          if (filters.category?.length) params.append('category', filters.category.join(','))
          if (filters.supplier_id?.length) params.append('supplier_id', filters.supplier_id.join(','))
          if (filters.stock_status?.length) params.append('stock_status', filters.stock_status.join(','))
          if (filters.abc_classification?.length) params.append('abc_classification', filters.abc_classification.join(','))
          if (filters.location?.length) params.append('location', filters.location.join(','))
          if (filters.min_value) params.append('min_value', filters.min_value.toString())
          if (filters.max_value) params.append('max_value', filters.max_value.toString())
          if (filters.low_stock_only) params.append('low_stock_only', 'true')
          if (filters.out_of_stock_only) params.append('out_of_stock_only', 'true')

          const response = await fetch(`/api/inventory/items?${params.toString()}`)
          if (!response.ok) throw new Error('Failed to fetch inventory items')

          const data = await response.json()
          set({ items: data.data, loading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      fetchProducts: async () => {
        set({ loading: true, error: null })
        try {
          const response = await fetch('/api/inventory/products')
          if (!response.ok) throw new Error('Failed to fetch products')

          const data = await response.json()
          set({ products: data.data, loading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      fetchSuppliers: async () => {
        set({ loading: true, error: null })
        try {
          const response = await fetch('/api/suppliers')
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

      fetchMovements: async (itemId?: string) => {
        set({ loading: true, error: null })
        try {
          const url = itemId
            ? `/api/inventory/movements?item_id=${itemId}`
            : '/api/inventory/movements'

          const response = await fetch(url)
          if (!response.ok) throw new Error('Failed to fetch stock movements')

          const data = await response.json()
          set({ movements: data.data, loading: false })
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
          const response = await fetch('/api/inventory/analytics')
          if (!response.ok) throw new Error('Failed to fetch analytics')

          const data = await response.json()
          set({ analytics: data.data, loading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      setFilters: (newFilters: Partial<InventoryFilters>) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        }))
        // Automatically refetch items when filters change
        get().fetchItems()
      },

      clearFilters: () => {
        set({ filters: initialFilters })
        get().fetchItems()
      },

      addProduct: async (productData: ProductFormData) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch('/api/inventory/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
          })

          if (!response.ok) throw new Error('Failed to add product')

          const data = await response.json()
          set((state) => ({
            products: [...state.products, data.data],
            loading: false
          }))

          // Refresh items to include new product
          get().fetchItems()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      updateProduct: async (id: string, productData: Partial<ProductFormData>) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch(`/api/inventory/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
          })

          if (!response.ok) throw new Error('Failed to update product')

          const data = await response.json()
          set((state) => ({
            products: state.products.map(p => p.id === id ? data.data : p),
            loading: false
          }))

          // Refresh items to reflect changes
          get().fetchItems()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      deleteProduct: async (id: string) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch(`/api/inventory/products/${id}`, {
            method: 'DELETE'
          })

          if (!response.ok) throw new Error('Failed to delete product')

          set((state) => ({
            products: state.products.filter(p => p.id !== id),
            items: state.items.filter(i => i.product_id !== id),
            loading: false
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      adjustInventory: async (adjustment: InventoryAdjustmentFormData) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch('/api/inventory/adjustments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adjustment)
          })

          if (!response.ok) throw new Error('Failed to adjust inventory')

          // Refresh items and movements after adjustment
          await Promise.all([
            get().fetchItems(),
            get().fetchMovements()
          ])

          set({ loading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: false
          })
        }
      },

      uploadPricelist: async (supplierId: string, file: File) => {
        set({ loading: true, error: null })
        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('supplier_id', supplierId)

          const response = await fetch('/api/inventory/pricelist-upload', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) throw new Error('Failed to upload pricelist')

          // Refresh products after successful upload
          get().fetchProducts()
          set({ loading: false })
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
      name: 'inventory-store',
      partialize: (state) => ({
        filters: state.filters
      })
    }
  )
)