'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Database, Settings as SettingsIcon, AlertCircle } from 'lucide-react';

export default function CompetitiveIntelligenceSettingsPage() {
  return (
    <AppLayout
      title="Settings"
      breadcrumbs={[
        { label: 'Pricing Optimization', href: '/pricing-optimization' },
        {
          label: 'Competitive Intelligence',
          href: '/pricing-optimization/competitive-intelligence',
        },
        { label: 'Settings' },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure competitive intelligence settings and policies
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg" asChild>
            <Link href="/pricing-optimization/competitive-intelligence/settings/retention">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="text-primary h-5 w-5" />
                  <CardTitle>Data Retention</CardTitle>
                </div>
                <CardDescription>Configure data retention and archival policies</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Set retention periods for snapshots, alerts, and job records
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg" asChild>
            <Link href="/pricing-optimization/competitive-intelligence/alerts/configure">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-primary h-5 w-5" />
                  <CardTitle>Alert Configuration</CardTitle>
                </div>
                <CardDescription>
                  Configure alert thresholds and notification channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Set up price breach alerts and competitive event notifications
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
