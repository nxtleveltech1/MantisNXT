/**
 * Accounts Receivable - Aging Report Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ReportSource = 'nxt' | 'xero';

interface AgingReportItem {
  customer_id: string;
  customer_name?: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  total: number;
}

export default function ARAgingPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [source, setSource] = useState<ReportSource>('nxt');
  const [agingData, setAgingData] = useState<AgingReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgingReport() {
      setLoading(true);
      setError(null);
      try {
        if (source === 'xero') {
          const response = await fetch('/api/xero/reports/aged-receivables?parsed=true');
          const result = await response.json();
          if (result.success && result.data?.contacts) {
            setAgingData(
              result.data.contacts.map((c: { contactId: string; contactName: string; current: number; thirtyDays: number; sixtyDays: number; ninetyDays: number; older: number; total: number }) => ({
                customer_id: c.contactId,
                customer_name: c.contactName,
                current: c.current,
                days_1_30: c.thirtyDays,
                days_31_60: c.sixtyDays,
                days_61_90: c.ninetyDays,
                days_over_90: c.older,
                total: c.total,
              }))
            );
          } else {
            setError(result.error || 'Failed to load from Xero');
          }
        } else {
          const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
          const response = await fetch(`/api/v1/financial/ar/aging?org_id=${orgId}`);
          const result = await response.json();
          if (result.success) {
            setAgingData(result.data || []);
          } else {
            setError(result.error || 'Failed to fetch aging report');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load aging report');
      } finally {
        setLoading(false);
      }
    }

    fetchAgingReport();
  }, [source]);

  const totals = agingData.reduce(
    (acc, item) => ({
      current: acc.current + item.current,
      days_1_30: acc.days_1_30 + item.days_1_30,
      days_31_60: acc.days_31_60 + item.days_31_60,
      days_61_90: acc.days_61_90 + item.days_61_90,
      days_over_90: acc.days_over_90 + item.days_over_90,
      total: acc.total + item.total,
    }),
    { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0, total: 0 }
  );

  return (
    <AppLayout
      title="AR Aging Report"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Accounts Receivable', href: '/financial/ar/invoices' },
        { label: 'Aging Report' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground">Accounts receivable aging analysis by customer</p>
          <div className="flex items-center gap-2">
            <Label htmlFor="ar-aging-source" className="text-sm text-muted-foreground">Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as ReportSource)}>
              <SelectTrigger id="ar-aging-source" className="w-[120px]">
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
            <CardTitle>Aging Report</CardTitle>
            <CardDescription>Outstanding amounts by aging bucket</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading aging report...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Error: {error}</div>
            ) : agingData.length === 0 ? (
              <div className="text-sm text-muted-foreground">No aging data found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Customer</th>
                      <th className="text-right p-2">Current</th>
                      <th className="text-right p-2">1-30 Days</th>
                      <th className="text-right p-2">31-60 Days</th>
                      <th className="text-right p-2">61-90 Days</th>
                      <th className="text-right p-2">90+ Days</th>
                      <th className="text-right p-2 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingData.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{item.customer_name || item.customer_id}</td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.current)}
                        </td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.days_1_30)}
                        </td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.days_31_60)}
                        </td>
                        <td className="text-right p-2">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.days_61_90)}
                        </td>
                        <td className="text-right p-2 text-destructive">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.days_over_90)}
                        </td>
                        <td className="text-right p-2 font-medium">
                          {new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(item.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold">
                      <td className="p-2">Total</td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.current)}
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.days_1_30)}
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.days_31_60)}
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.days_61_90)}
                      </td>
                      <td className="text-right p-2 text-destructive">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.days_over_90)}
                      </td>
                      <td className="text-right p-2">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: 'ZAR',
                        }).format(totals.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

