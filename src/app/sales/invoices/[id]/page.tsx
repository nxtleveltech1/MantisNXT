'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentStatusBadge } from '@/components/sales/DocumentStatusBadge';
import { DocumentTotals } from '@/components/sales/DocumentTotals';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  document_number: string;
  customer_id: string;
  status: string;
  currency: string;
  subtotal: number;
  total_tax: number;
  total: number;
  amount_due: number;
  due_date?: string | null;
  items?: any[];
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => fetchInvoice(p.id));
  }, [params]);

  const fetchInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/sales/invoices/${invoiceId}`);
      const result = await response.json();

      if (result.success) {
        setInvoice(result.data);
      } else {
        toast.error('Failed to fetch invoice');
        router.push('/sales/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Error loading invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !invoice) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'ZAR',
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sales/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{invoice.document_number}</h1>
            <p className="text-muted-foreground">Invoice Details</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-muted-foreground text-sm">Status</div>
                <div className="mt-1">
                  <DocumentStatusBadge status={invoice.status as any} type="invoice" />
                </div>
              </div>
              {invoice.due_date && (
                <div>
                  <div className="text-muted-foreground text-sm">Due Date</div>
                  <div className="mt-1">{new Date(invoice.due_date).toLocaleDateString()}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground text-sm">Amount Due</div>
                <div className="mt-1 font-semibold">{formatCurrency(invoice.amount_due)}</div>
              </div>
              <DocumentTotals
                subtotal={invoice.subtotal}
                totalTax={invoice.total_tax}
                total={invoice.total}
                currency={invoice.currency}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

