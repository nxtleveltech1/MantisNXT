'use client';

import AppLayout from '@/components/layout/AppLayout';
import { DeliveryRoutePlanner } from '@/components/logistics/DeliveryRoutePlanner';

export default function RoutesPage() {
  return (
    <AppLayout
      title="Route Planning"
      breadcrumbs={[
        { label: 'Courier Logistics', href: '/logistics/dashboard' },
        { label: 'Route Planning' },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Route Planning</h1>
          <p className="text-muted-foreground">Optimize delivery routes with AI-powered planning</p>
        </div>
        <DeliveryRoutePlanner />
      </div>
    </AppLayout>
  );
}
