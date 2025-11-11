'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import ProductSelectionWizard from '@/components/suppliers/ProductSelectionWizard'
import AppLayout from '@/components/layout/AppLayout'

export default function PromotePricelistPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const pricelistId = params?.id ? String(params.id) : ''
  const supplierId = searchParams?.get('supplierId') ?? ''
  const supplierNameParam = searchParams?.get('supplierName') ?? ''
  const supplierName = supplierNameParam ? decodeURIComponent(supplierNameParam) : 'Unknown Supplier'

  const handleComplete = (result: unknown) => {
    // Show success message and redirect
    const message = `Successfully processed ${result.created + result.updated} items`
    router.push(`/suppliers/${supplierId}?message=${encodeURIComponent(message)}`)
  }

  const handleCancel = () => {
    router.back()
  }

  if (!pricelistId || !supplierId) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Missing Pricelist Information</h1>
          <p className="text-gray-600 mb-6">
            We need both a pricelist ID and supplier details to proceed with product selection.
          </p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <ProductSelectionWizard
        pricelistId={pricelistId}
        supplierId={supplierId}
        supplierName={decodeURIComponent(supplierName)}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </AppLayout>
  )
}