import AdminLayout from '@/components/layout/AdminLayout'
import ViewportOptimizedDashboard from '@/components/dashboard/ViewportOptimizedDashboard'

export default function Home() {
  return (
    <AdminLayout>
      <ViewportOptimizedDashboard />
    </AdminLayout>
  )
}