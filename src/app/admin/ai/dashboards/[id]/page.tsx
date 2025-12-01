'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import DashboardBuilder from '@/components/ai/admin/DashboardBuilder';

/**
 * AI Dashboard Edit Admin Page
 *
 * View and edit a specific custom dashboard.
 * Allows admins to modify existing dashboard configurations.
 */
export default function DashboardEditPage() {
  const params = useParams();
  const dashboardId = params?.id as string;

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'AI Services', href: '/admin/ai' },
        { label: 'Dashboards', href: '/admin/ai/dashboards' },
        { label: `Dashboard ${dashboardId}` },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Dashboard</h1>
          <p className="text-muted-foreground">Modify dashboard configuration and widget layout</p>
        </div>

        <DashboardBuilder dashboardId={dashboardId} />
      </div>
    </AppLayout>
  );
}
