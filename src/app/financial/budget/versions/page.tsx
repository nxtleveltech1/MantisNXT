/**
 * Budgeting - Budget Versions Page
 */

'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useXeroConnection } from '@/hooks/useXeroConnection';

export default function BudgetVersionsPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [xeroBudgets, setXeroBudgets] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function importFromXero() {
    if (!xeroConnected) return;
    setLoading(true);
    try {
      const response = await fetch('/api/xero/budgets');
      const result = await response.json();
      if (result.success && result.data) {
        const data = result.data as { data?: unknown[] };
        setXeroBudgets(Array.isArray(data?.data) ? data.data : []);
      } else {
        setXeroBudgets([]);
      }
    } catch (err) {
      console.error('Error fetching Xero budgets:', err);
      setXeroBudgets([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout
      title="Budget Versions"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Budgeting', href: '/financial/budget/versions' },
        { label: 'Budget Versions' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Manage budget versions</p>
          {xeroConnected && (
            <Button variant="outline" onClick={importFromXero} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Import from Xero'}
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Budget Versions</CardTitle>
            <CardDescription>List of budget versions</CardDescription>
          </CardHeader>
          <CardContent>
            {xeroBudgets !== null && xeroBudgets.length > 0 ? (
              <div className="text-sm text-muted-foreground">
                {xeroBudgets.length} budget(s) loaded from Xero.
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Budget versions list will be displayed here.
                {xeroConnected && ' Click "Import from Xero" to load budgets from Xero.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

