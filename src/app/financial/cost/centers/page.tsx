/**
 * Cost Accounting - Cost Centers Page
 */

'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useXeroConnection } from '@/hooks/useXeroConnection';

export default function CostCentersPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [xeroTracking, setXeroTracking] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadFromXero() {
    if (!xeroConnected) return;
    setLoading(true);
    try {
      const response = await fetch('/api/xero/tracking-categories');
      const result = await response.json();
      const data = result.data as { data?: unknown[] } | undefined;
        if (result.success && Array.isArray(data?.data)) {
          setXeroTracking(data.data);
        } else {
          setXeroTracking([]);
        }
    } catch (err) {
      console.error('Error fetching Xero tracking categories:', err);
      setXeroTracking([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout
      title="Cost Centers"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Cost Accounting', href: '/financial/cost/centers' },
        { label: 'Cost Centers' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Manage cost centers</p>
          {xeroConnected && (
            <Button variant="outline" onClick={loadFromXero} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Sync from Xero'}
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Cost Centers</CardTitle>
            <CardDescription>List of cost centers (Xero tracking categories)</CardDescription>
          </CardHeader>
          <CardContent>
            {xeroTracking !== null && xeroTracking.length > 0 ? (
              <div className="text-sm text-muted-foreground">
                {xeroTracking.length} tracking categor(y/ies) loaded from Xero.
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Cost centers list will be displayed here.
                {xeroConnected && ' Click "Sync from Xero" to load tracking categories from Xero.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

