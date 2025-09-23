import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import SupplierDirectory from '@/components/suppliers/SupplierDirectory'
import EnhancedSupplierDashboard from '@/components/suppliers/EnhancedSupplierDashboard'

export default function SuppliersPage() {
  return (
    <SelfContainedLayout title="Suppliers" breadcrumbs={[]}>
      <EnhancedSupplierDashboard />
    </SelfContainedLayout>
  )
}