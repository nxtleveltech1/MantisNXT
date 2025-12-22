/**
 * Financial Reports - Balance Sheet Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportService, type BalanceSheet } from '@/lib/services/financial';

export default function BalanceSheetPage() {
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBalanceSheet() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/reports/balance-sheet?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setBalanceSheet(result.data);
        } else {
          setError(result.error || 'Failed to generate balance sheet');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching balance sheet:', err);
        setError(err instanceof Error ? err.message : 'Failed to load balance sheet');
        setLoading(false);
      }
    }

    fetchBalanceSheet();
  }, []);

  return (
    <AppLayout 
      title="Balance Sheet" 
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Financial Reports', href: '/financial/reports/balance-sheet' },
        { label: 'Balance Sheet' }
      ]}
    >
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground">Financial position statement</p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
          <CardDescription>As of selected date</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Generating balance sheet...</div>
          ) : error ? (
            <div className="text-sm text-destructive">Error: {error}</div>
          ) : balanceSheet ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Assets</h3>
                <div className="ml-4 space-y-1">
                  <div className="text-sm">Current Assets: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(balanceSheet.assets.total_assets)}</div>
                  <div className="text-sm">Fixed Assets: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(balanceSheet.assets.total_assets)}</div>
                  <div className="font-medium">Total Assets: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(balanceSheet.assets.total_assets)}</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Liabilities</h3>
                <div className="ml-4 space-y-1">
                  <div className="text-sm">Current Liabilities: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(balanceSheet.liabilities.total_liabilities)}</div>
                  <div className="text-sm">Long-term Liabilities: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(balanceSheet.liabilities.total_liabilities)}</div>
                  <div className="font-medium">Total Liabilities: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(balanceSheet.liabilities.total_liabilities)}</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Equity</h3>
                <div className="ml-4">
                  <div className="font-medium">Total Equity: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(balanceSheet.total_equity)}</div>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="font-bold text-lg">
                  Total Liabilities and Equity: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(balanceSheet.total_liabilities_and_equity)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}
