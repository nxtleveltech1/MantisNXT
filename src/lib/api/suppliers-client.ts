// Client-side API functions for suppliers
// This file provides client-safe functions that use fetch() instead of direct database calls

import type { Supplier } from '@/types/supplier'

export async function getSupplierById(id: string): Promise<Supplier | null> {
  try {
    const response = await fetch(`/api/suppliers/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch supplier: ${response.statusText}`)
    }
    const result = await response.json()
    return result.data || null
  } catch (error) {
    console.error('Error fetching supplier:', error)
    throw error
  }
}

export async function getSuppliers(filters?: {
  status?: string
  tier?: string
  search?: string
}): Promise<Supplier[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.tier) params.append('tier', filters.tier)
    if (filters?.search) params.append('search', filters.search)

    const response = await fetch(`/api/suppliers?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch suppliers: ${response.statusText}`)
    }
    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    throw error
  }
}