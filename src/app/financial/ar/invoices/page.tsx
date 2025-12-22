/**
 * Accounts Receivable - Customer Invoices Page
 */

'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { ARService, type ARCustomerInvoice } from '@/lib/services/financial';

export default function ARInvoicesPage() {
  const [invoices, setInvoices] = useState<ARCustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const response = await fetch(`/api/v1/financial/ar/invoices?org_id=${orgId}`);
        const result = await response.json();

        if (result.success) {
          setInvoices(result.data || []);
        } else {
          setError(result.error || 'Failed to fetch invoices');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError(err instanceof Error ? err.message : 'Failed to load invoices');
        setLoading(false);
      }
    }

    fetchInvoices();
  }, []);

  return (
    <AppLayout 
      title="Customer Invoices" 
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Accounts Receivable', href: '/financial/ar/invoices' },
        { label: 'Customer Invoices' }
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Manage accounts receivable invoices (including Sales Services invoices)</p>
          </div>
          <Button asChild>
            <Link href="/financial/ar/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>List of customer invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading invoices...</div>
          ) : error ? (
            <div className="text-sm text-destructive">Error: {error}</div>
          ) : invoices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No invoices found</div>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">
                      {invoice.invoice_number}
                      {invoice.source_type === 'sales_invoice' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Sales Invoice
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Customer: {invoice.customer_id} | Status: {invoice.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {new Intl.NumberFormat('en-ZA', {
                        style: 'currency',
                        currency: invoice.currency || 'ZAR',
                      }).format(invoice.total_amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
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
