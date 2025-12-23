/**
 * Accounts Receivable - New Receipt Page
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewARReceiptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const formData = new FormData(e.currentTarget);
      const receiptData = {
        org_id: orgId,
        customer_id: formData.get('customer_id'),
        invoice_id: formData.get('invoice_id') || null,
        receipt_date: formData.get('receipt_date'),
        payment_method: formData.get('payment_method') || 'bank_transfer',
        reference_number: formData.get('reference_number'),
        currency: formData.get('currency') || 'ZAR',
        amount: parseFloat(formData.get('amount') as string) || 0,
        notes: formData.get('notes'),
      };

      const response = await fetch('/api/v1/financial/ar/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/financial/ar/receipts');
      } else {
        setError(result.error || 'Failed to create receipt');
      }
    } catch (err) {
      console.error('Error creating receipt:', err);
      setError(err instanceof Error ? err.message : 'Failed to create receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="New Receipt"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Accounts Receivable', href: '/financial/ar/invoices' },
        { label: 'Receipts', href: '/financial/ar/receipts' },
        { label: 'New Receipt' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Record a new customer receipt</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/financial/ar/receipts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Receipts
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Receipt Details</CardTitle>
            <CardDescription>Enter receipt information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Customer ID *</Label>
                  <Input id="customer_id" name="customer_id" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_id">Invoice ID (optional)</Label>
                  <Input id="invoice_id" name="invoice_id" placeholder="Link to specific invoice" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt_date">Receipt Date *</Label>
                  <Input
                    id="receipt_date"
                    name="receipt_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="bank_transfer"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="eft">EFT</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input id="reference_number" name="reference_number" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" defaultValue="ZAR" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={4} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/financial/ar/receipts">Cancel</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Receipt'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

