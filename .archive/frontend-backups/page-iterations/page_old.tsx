import AdminLayout from '@/components/layout/AdminLayout';
import EnhancedSupplierDashboard from '@/components/dashboard/EnhancedSupplierDashboard';

export default function Home() {
  return (
    <AdminLayout>
      <EnhancedSupplierDashboard />
    </AdminLayout>
  );
}
