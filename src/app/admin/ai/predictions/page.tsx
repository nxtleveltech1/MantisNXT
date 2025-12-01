'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PredictionMonitor from '@/components/ai/admin/PredictionMonitor';

/**
 * AI Predictions Monitor Admin Page
 *
 * Track AI predictions and their accuracy over time.
 * Allows admins to monitor prediction performance and trends.
 */
export default function PredictionsPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: 'AI Services', href: '/admin/ai' }, { label: 'Predictions' }]}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prediction Monitor</h1>
          <p className="text-muted-foreground">
            Track AI predictions, accuracy metrics, and performance trends
          </p>
        </div>

        <PredictionMonitor />
      </div>
    </AppLayout>
  );
}
