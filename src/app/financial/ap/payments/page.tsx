/**
 * Accounts Payable - Payments Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { buildClientXeroUrl, getClientXeroHeaders } from '@/lib/xero/client-org';
import { type APPayment } from '@/lib/services/financial';
import { XeroSyncButton, XeroSyncStatus, XeroEntityLink } from '@/components/xero';

type ListSource = 'nxt' | 'xero';

interface PaymentRow {
  id: string;
  payment_number?: string;
  amount: number;
  currency: string;
  payment_date?: string;
  created_at?: string;
  status: string;
  payment_method?: string;
  vendor_id?: string;
  reference_number?: string;
  invoice_number?: string;
}

export default function APPaymentsPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [source, setSource] = useState<ListSource>('nxt');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      setError(null);
      try {
        if (source === 'xero') {
          const response = await fetch(buildClientXeroUrl('/api/xero/sync/payments?invoiceType=ACCPAY'), {
            headers: getClientXeroHeaders(),
          });
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setPayments(
              result.data.map((p: { id: string; amount: number; date?: string; reference?: string; status: string; invoice_number?: string }) => ({
                id: p.id,
                amount: p.amount,
                currency: 'ZAR',
                payment_date: p.date,
                created_at: p.date,
                status: p.status,
                reference_number: p.reference,
                invoice_number: p.invoice_number,
              }))
            );
          } else {
            setError(result.error || 'Failed to fetch from Xero');
            setPayments([]);
          }
        } else {
          const response = await fetch('/api/v1/financial/ap/payments');
          const result = await response.json();
          if (response.ok && result.success !== false && !result.error) {
            setPayments((result.data ?? []) as PaymentRow[]);
          } else {
            setError(result.error || 'Failed to fetch payments');
            setPayments([]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payments');
        setPayments([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [source]);

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AppLayout
      title="Payments"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Accounts Payable', href: '/financial/ap/invoices' },
        { label: 'Payments' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Manage accounts payable payments</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ap-pay-source" className="text-sm text-muted-foreground">
              Source
            </Label>
            <Select value={source} onValueChange={(v) => setSource(v as ListSource)}>
              <SelectTrigger id="ap-pay-source" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nxt">NXT</SelectItem>
                {xeroConnected && <SelectItem value="xero">Xero</SelectItem>}
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/financial/ap/payments/new">
                <Plus className="mr-2 h-4 w-4" />
                New Payment
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>List of vendor payments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading payments...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Error: {error}</div>
            ) : payments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No payments found</div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{payment.payment_number ?? payment.invoice_number ?? payment.id}</div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(
                            payment.status
                          )}`}
                        >
                          {payment.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {payment.vendor_id ? `Vendor: ${payment.vendor_id} | ` : ''}
                        Method: {payment.payment_method?.replace('_', ' ') ?? '-'} | Date:{' '}
                        {new Date(payment.payment_date ?? payment.created_at ?? '').toLocaleDateString()}
                      </div>
                      {payment.reference_number && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Reference: {payment.reference_number}
                        </div>
                      )}
                    </div>
                    {source === 'nxt' && (
                      <div className="flex items-center gap-2">
                        <XeroSyncStatus entityType="payment" entityId={payment.id} />
                        <XeroSyncButton entityType="payment" entityId={payment.id} size="sm" />
                        <XeroEntityLink entityType="payment" entityId={payment.id} size="sm" />
                      </div>
                    )}
                    <div className="text-right">
                      <div className="font-medium text-lg">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.created_at ?? payment.payment_date ?? '').toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

