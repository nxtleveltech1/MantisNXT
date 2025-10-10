'use client'

/**
 * Product Selection Wizard Wrapper
 * Adapts ProductToInventoryWizard for use in pricelist promotion flow
 * This component bridges the gap between the page-level API and the dialog-based wizard
 */

import { useState, useEffect } from 'react'
import ProductToInventoryWizard from './ProductToInventoryWizard'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProductSelectionWizardProps {
  pricelistId: string
  supplierId: string
  supplierName: string
  onComplete: (result: { created: number; updated: number }) => void
  onCancel: () => void
}

export default function ProductSelectionWizard({
  pricelistId,
  supplierId,
  supplierName,
  onComplete,
  onCancel,
}: ProductSelectionWizardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productIds, setProductIds] = useState<string[]>([])

  useEffect(() => {
    loadPricelistProducts()
  }, [pricelistId])

  const loadPricelistProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/suppliers/${supplierId}/pricelists/${pricelistId}/products`)

      if (!response.ok) {
        throw new Error('Failed to load pricelist products')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load pricelist products')
      }

      // Extract product IDs from the pricelist
      const ids = data.data.map((product: any) => product.id)
      setProductIds(ids)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricelist products')
    } finally {
      setLoading(false)
    }
  }

  const handleWizardComplete = (results: any[]) => {
    // Transform wizard results to match expected format
    const created = results.filter(r => r.status === 'success').length
    const updated = 0 // Wizard creates new inventory items, doesn't update existing ones

    onComplete({ created, updated })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Loading pricelist products...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Preparing product selection wizard
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Failed to Load Products</p>
            <p className="text-sm">{error}</p>
          </AlertDescription>
        </Alert>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (productIds.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-xl font-bold mb-2">No Products Found</h2>
        <p className="text-gray-600 mb-6">
          This pricelist doesn&apos;t contain any products yet.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <ProductToInventoryWizard
      isOpen={true}
      onClose={onCancel}
      supplierId={supplierId}
      supplierName={supplierName}
      productIds={productIds}
      onComplete={handleWizardComplete}
    />
  )
}
