/**
 * Financial Reports - Balance Sheet Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportService, type BalanceSheet } from '@/lib/services/financial';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { buildClientXeroUrl, getClientXeroHeaders } from '@/lib/xero/client-org';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ReportSource = 'nxt' | 'xero';

export default function BalanceSheetPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [source, setSource] = useState<ReportSource>('nxt');
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBalanceSheet() {
      setLoading(true);
      setError(null);
      try {
        if (source === 'xero') {
          const response = await fetch(buildClientXeroUrl('/api/xero/reports/balance-sheet?parsed=true'), {
            headers: getClientXeroHeaders(),
          });
          const result = await response.json();
          if (result.success && result.data) {
            const x = result.data as { assets: { current: number; fixed: number; total: number }; liabilities: { total: number }; equity: number };
            setBalanceSheet({
              assets: { current_assets: [], fixed_assets: [], total_assets: x.assets.total },
              liabilities: { current_liabilities: [], long_term_liabilities: [], total_liabilities: x.liabilities.total },
              equity: [],
              total_equity: x.equity,
              total_liabilities_and_equity: x.liabilities.total + x.equity,
            });
          } else {
            setError(result.error || 'Failed to load from Xero');
          }
        } else {
          const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
          const response = await fetch(`/api/v1/financial/reports/balance-sheet?org_id=${orgId}`);
          const result = await response.json();
          if (result.success) {
            setBalanceSheet(result.data);
          } else {
            setError(result.error || 'Failed to generate balance sheet');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load balance sheet');
      } finally {
        setLoading(false);
      }
    }

    fetchBalanceSheet();
  }, [source]);

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
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground">Financial position statement</p>
          <div className="flex items-center gap-2">
            <Label htmlFor="source" className="text-sm text-muted-foreground">Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as ReportSource)}>
              <SelectTrigger id="source" className="w-[120px]">
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

