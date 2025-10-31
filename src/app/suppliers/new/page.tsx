import EnhancedSupplierForm from '@/components/suppliers/EnhancedSupplierForm'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'

export default function NewSupplierPage() {
  return (
    <SelfContainedLayout
      title="Add New Supplier"
      breadcrumbs={[
        { label: 'Suppliers', href: '/suppliers' },
        { label: 'New Supplier' },
      ]}
    >
      <EnhancedSupplierForm />
    </SelfContainedLayout>
  )
}