import UnifiedSupplierDashboard from '@/components/suppliers/UnifiedSupplierDashboard'
import AsyncBoundary from '@/components/ui/AsyncBoundary'

export default function SuppliersPage() {
  return (
    <AsyncBoundary>
      <UnifiedSupplierDashboard />
    </AsyncBoundary>
  )
}
