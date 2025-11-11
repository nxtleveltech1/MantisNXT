import AppLayout from '@/components/layout/AppLayout'
import EnhancedSupplierDashboard from '@/components/suppliers/EnhancedSupplierDashboard'

export default function SuppliersPage() {
  return (
    <AppLayout title="Suppliers" breadcrumbs={[]}>
      <EnhancedSupplierDashboard />
    </AppLayout>
  )
}