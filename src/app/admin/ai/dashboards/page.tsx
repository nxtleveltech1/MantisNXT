'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DashboardBuilder from '@/components/ai/admin/DashboardBuilder';

/**
 * AI Dashboards Admin Page
 *
 * Drag-and-drop dashboard builder for custom AI analytics dashboards.
 * Allows admins to create and configure custom dashboard layouts.
 */
export default function DashboardsPage() {
  return (
    <AppLayout breadcrumbs={[{ label: 'AI Services', href: '/admin/ai' }, { label: 'Dashboards' }]}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Builder</h1>
          <p className="text-muted-foreground">
            Create and configure custom analytics dashboards with AI widgets
          </p>
        </div>

        <DashboardBuilder />
      </div>
    </AppLayout>
  );
}
