import AdminLayout from '@/components/layout/AdminLayout'
import OptimizedDashboard from '@/components/dashboard/OptimizedDashboard'

export default function Home() {
  return (
    <AdminLayout>
      <OptimizedDashboard />
    </AdminLayout>
  )
}