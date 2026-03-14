/**
 * Budgeting - Budget Versions Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useXeroConnection } from '@/hooks/useXeroConnection';

type ListSource = 'nxt' | 'xero';

export default function BudgetVersionsPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [source, setSource] = useState<ListSource>('nxt');
  const [budgets, setBudgets] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBudgets() {
      setLoading(true);
      setError(null);
      try {
        if (source === 'xero') {
          const response = await fetch('/api/xero/budgets');
          const result = await response.json();
          if (result.success && result.data) {
            const data = result.data as { data?: unknown[] };
            setBudgets(Array.isArray(data?.data) ? data.data : []);
          } else {
            setError(result.error || 'Failed to fetch from Xero');
            setBudgets([]);
          }
        } else {
          const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
          const response = await fetch(`/api/v1/financial/budget/versions?org_id=${orgId}`);
          const result = await response.json();
          if (response.ok && !result.error && Array.isArray(result.data)) {
            setBudgets(result.data);
          } else {
            setBudgets([]);
          }
        }
      } catch (err) {
        setBudgets([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBudgets();
  }, [source]);

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
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground">Manage budget versions</p>
          <div className="flex items-center gap-2">
            <Label htmlFor="budget-source" className="text-sm text-muted-foreground">
              Source
            </Label>
            <Select value={source} onValueChange={(v) => setSource(v as ListSource)}>
              <SelectTrigger id="budget-source" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nxt">NXT</SelectItem>
                {xeroConnected && <SelectItem value="xero">Xero</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Budget Versions</CardTitle>
            <CardDescription>List of budget versions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Error: {error}</div>
            ) : budgets.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {source === 'xero' ? 'No budgets in Xero.' : 'No budget versions found.'}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {budgets.length} budget version(s) from {source === 'xero' ? 'Xero' : 'NXT'}.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

