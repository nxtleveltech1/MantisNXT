import EnhancedSupplierForm from '@/components/suppliers/EnhancedSupplierForm';
import AppLayout from '@/components/layout/AppLayout';

export default function NewSupplierPage() {
  return (
    <AppLayout
      title="Add New Supplier"
      breadcrumbs={[{ label: 'Suppliers', href: '/suppliers' }, { label: 'New Supplier' }]}
    >
      <EnhancedSupplierForm />
    </AppLayout>
  );
}
