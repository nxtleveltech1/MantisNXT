'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import ProductSelectionWizard from '@/components/suppliers/ProductSelectionWizard'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'

export default function PromotePricelistPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const pricelistId = params.id as string
  const supplierId = searchParams.get('supplierId') || ''
  const supplierName = searchParams.get('supplierName') || 'Unknown Supplier'

  const handleComplete = (result: any) => {
    // Show success message and redirect
    const message = `Successfully processed ${result.created + result.updated} items`
    router.push(`/suppliers/${supplierId}?message=${encodeURIComponent(message)}`)
  }

  const handleCancel = () => {
    router.back()
  }

  if (!supplierId) {
    return (
      <SelfContainedLayout>
        <div className="max-w-2xl mx-auto p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Missing Supplier Information</h1>
          <p className="text-gray-600 mb-6">
            Supplier ID is required to proceed with product selection.
          </p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </SelfContainedLayout>
    )
  }

  return (
    <SelfContainedLayout>
      <ProductSelectionWizard
        pricelistId={pricelistId}
        supplierId={supplierId}
        supplierName={decodeURIComponent(supplierName)}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </SelfContainedLayout>
  )
}