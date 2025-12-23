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
import { APService, type APPayment } from '@/lib/services/financial';

export default function APPaymentsPage() {
  const [payments, setPayments] = useState<APPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/v1/financial/ap/payments');
        const result = await response.json();

        if (result.success) {
          setPayments(result.data || []);
        } else {
          setError(result.error || 'Failed to fetch payments');
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, []);

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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage accounts payable payments</p>
          </div>
          <Button asChild>
            <Link href="/financial/ap/payments/new">
              <Plus className="mr-2 h-4 w-4" />
              New Payment
            </Link>
          </Button>
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
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{payment.payment_number}</div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(
                            payment.status
                          )}`}
                        >
                          {payment.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Vendor: {payment.vendor_id} | Method: {payment.payment_method.replace('_', ' ')} | Date:{' '}
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
                      {payment.reference_number && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Reference: {payment.reference_number}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-lg">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
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
