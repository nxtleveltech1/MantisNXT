import ViewportAdminLayout from '@/components/layout/ViewportAdminLayout';
import ViewportOptimizedDashboard from '@/components/dashboard/ViewportOptimizedDashboard';

export default function Home() {
  return (
    <ViewportAdminLayout>
      <ViewportOptimizedDashboard />
    </ViewportAdminLayout>
  );
}
