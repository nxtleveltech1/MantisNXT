/**
 * Accounts Receivable - New Invoice Page
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

export default function NewARInvoicePage() {
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
      const invoiceData = {
        org_id: orgId,
        customer_id: formData.get('customer_id'),
        invoice_date: formData.get('invoice_date'),
        due_date: formData.get('due_date'),
        currency: formData.get('currency') || 'ZAR',
        subtotal: parseFloat(formData.get('subtotal') as string) || 0,
        tax_amount: parseFloat(formData.get('tax_amount') as string) || 0,
        total_amount: parseFloat(formData.get('total_amount') as string) || 0,
        notes: formData.get('notes'),
      };

      const response = await fetch('/api/v1/financial/ar/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/financial/ar/invoices');
      } else {
        setError(result.error || 'Failed to create invoice');
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="New Customer Invoice"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Accounts Receivable', href: '/financial/ar/invoices' },
        { label: 'New Invoice' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Create a new customer invoice</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/financial/ar/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Enter customer invoice information</CardDescription>
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
                  <Label htmlFor="invoice_date">Invoice Date *</Label>
                  <Input
                    id="invoice_date"
                    name="invoice_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input id="due_date" name="due_date" type="date" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" defaultValue="ZAR" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtotal">Subtotal</Label>
                  <Input id="subtotal" name="subtotal" type="number" step="0.01" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_amount">Tax Amount</Label>
                  <Input id="tax_amount" name="tax_amount" type="number" step="0.01" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount *</Label>
                  <Input id="total_amount" name="total_amount" type="number" step="0.01" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={4} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/financial/ar/invoices">Cancel</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

