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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useXeroConnection } from '@/hooks/useXeroConnection';
import { type ARCustomerInvoice } from '@/lib/services/financial';
import { XeroSyncButton, XeroSyncStatus, XeroEntityLink } from '@/components/xero';

type ListSource = 'nxt' | 'xero';

interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_id?: string;
  contact_name?: string;
  status: string;
  total_amount: number;
  due_date: string;
  currency: string;
  source_type?: string;
}

export default function ARInvoicesPage() {
  const { isConnected: xeroConnected } = useXeroConnection();
  const [source, setSource] = useState<ListSource>('nxt');
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true);
      setError(null);
      try {
        if (source === 'xero') {
          const response = await fetch('/api/xero/sync/invoices?type=ACCREC');
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setInvoices(result.data);
          } else {
            setError(result.error || 'Failed to fetch from Xero');
            setInvoices([]);
          }
        } else {
          const orgId = localStorage.getItem('org_id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
          const response = await fetch(`/api/v1/financial/ar/invoices?org_id=${orgId}`);
          const result = await response.json();
          if (response.ok && !result.error) {
            const data = (result.data ?? []) as ARCustomerInvoice[];
            setInvoices(
              data.map((inv) => ({
                id: inv.id,
                invoice_number: inv.invoice_number,
                customer_id: inv.customer_id,
                status: inv.status,
                total_amount: inv.total_amount,
                due_date: inv.due_date,
                currency: inv.currency ?? 'ZAR',
                source_type: inv.source_type,
              }))
            );
          } else {
            setError(result.error || 'Failed to fetch invoices');
            setInvoices([]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoices');
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [source]);

  return (
    <AppLayout
      title="Customer Invoices"
      breadcrumbs={[
        { label: 'Financial', href: '/financial' },
        { label: 'Accounts Receivable', href: '/financial/ar/invoices' },
        { label: 'Customer Invoices' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Manage accounts receivable invoices (including Sales Services invoices)</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ar-inv-source" className="text-sm text-muted-foreground">
              Source
            </Label>
            <Select value={source} onValueChange={(v) => setSource(v as ListSource)}>
              <SelectTrigger id="ar-inv-source" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nxt">NXT</SelectItem>
                {xeroConnected && <SelectItem value="xero">Xero</SelectItem>}
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/financial/ar/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Link>
            </Button>
          </div>
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
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-2 border rounded border-border"
                  >
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {invoice.invoice_number}
                        {source === 'nxt' && invoice.source_type === 'sales_invoice' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Sales Invoice
                          </span>
                        )}
                        {source === 'nxt' && (
                          <XeroSyncStatus entityType="invoice" entityId={invoice.id} />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {source === 'xero'
                          ? `Contact: ${invoice.contact_name ?? invoice.customer_id ?? '-'}`
                          : `Customer: ${invoice.customer_id}`}
                        {' | '}
                        Status: {invoice.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                      {source === 'nxt' && (
                        <div className="flex items-center gap-2">
                          <XeroSyncButton entityType="invoice" entityId={invoice.id} size="sm" />
                          <XeroEntityLink entityType="invoice" entityId={invoice.id} size="sm" />
                        </div>
                      )}
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
