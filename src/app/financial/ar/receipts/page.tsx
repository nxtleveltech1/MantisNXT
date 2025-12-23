/**
 * Accounts Receivable - Receipts Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

interface Receipt {
  id: string;
  receipt_number: string;
  customer_id: string;
  invoice_id?: string;
  amount: number;
  currency: string;
  receipt_date: string;
  payment_method: string;
  reference_number?: string;
  status: string;
  created_at: string;
}

export default function ARReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReceipts() {
      try {
        setLoading(true);
        setError(null);
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/ar/receipts?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setReceipts(result.data || []);
        } else {
          setError(result.error || 'Failed to fetch receipts');
        }
      } catch (err) {
        console.error('Error fetching receipts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load receipts');
      } finally {
        setLoading(false);
      }
    }

    fetchReceipts();
  }, []);

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      received: 'bg-green-100 text-green-800',
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
      title="Receipts"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Accounts Receivable', href: '/financial/ar/invoices' },
        { label: 'Receipts' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage accounts receivable receipts</p>
          </div>
          <Button asChild>
            <Link href="/financial/ar/receipts/new">
              <Plus className="mr-2 h-4 w-4" />
              New Receipt
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
            <CardDescription>List of customer receipts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading receipts...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Error: {error}</div>
            ) : receipts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No receipts found</div>
            ) : (
              <div className="space-y-2">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{receipt.receipt_number}</div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(receipt.status)}`}
                        >
                          {receipt.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Customer: {receipt.customer_id} | Method: {receipt.payment_method.replace('_', ' ')} | Date:{' '}
                        {new Date(receipt.receipt_date).toLocaleDateString()}
                      </div>
                      {receipt.reference_number && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Reference: {receipt.reference_number}
                        </div>
                      )}
                      {receipt.invoice_id && (
                        <div className="text-xs text-muted-foreground mt-1">Invoice: {receipt.invoice_id}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-lg">
                        {formatCurrency(receipt.amount, receipt.currency)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(receipt.created_at).toLocaleDateString()}
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

