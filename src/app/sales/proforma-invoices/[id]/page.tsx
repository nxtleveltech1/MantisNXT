'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentStatusBadge } from '@/components/sales/DocumentStatusBadge';
import { DocumentTotals } from '@/components/sales/DocumentTotals';
import { toast } from 'sonner';

interface ProformaInvoice {
  id: string;
  document_number: string;
  customer_id: string;
  status: string;
  currency: string;
  subtotal: number;
  total_tax: number;
  total: number;
  items?: any[];
}

export default function ProformaInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [proformaInvoice, setProformaInvoice] = useState<ProformaInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => fetchProformaInvoice(p.id));
  }, [params]);

  const fetchProformaInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/sales/proforma-invoices/${invoiceId}`);
      const result = await response.json();

      if (result.success) {
        setProformaInvoice(result.data);
      } else {
        toast.error('Failed to fetch proforma invoice');
        router.push('/sales/proforma-invoices');
      }
    } catch (error) {
      console.error('Error fetching proforma invoice:', error);
      toast.error('Error loading proforma invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!proformaInvoice) return;

    try {
      const response = await fetch(`/api/v1/sales/proforma-invoices/${proformaInvoice.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ created_by: 'current-user-id' }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Proforma invoice converted to invoice');
        router.push(`/sales/invoices/${result.data.invoice_id}`);
      } else {
        toast.error(result.error || 'Failed to convert proforma invoice');
      }
    } catch (error) {
      console.error('Error converting proforma invoice:', error);
      toast.error('Error converting proforma invoice');
    }
  };

  if (loading || !proformaInvoice) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/sales/proforma-invoices')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{proformaInvoice.document_number}</h1>
              <p className="text-muted-foreground">Proforma Invoice Details</p>
            </div>
          </div>
          {proformaInvoice.status !== 'converted' && (
            <Button onClick={handleConvertToInvoice}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Convert to Invoice
            </Button>
          )}
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
                  <DocumentStatusBadge status={proformaInvoice.status as any} type="proforma-invoice" />
                </div>
              </div>
              <DocumentTotals
                subtotal={proformaInvoice.subtotal}
                totalTax={proformaInvoice.total_tax}
                total={proformaInvoice.total}
                currency={proformaInvoice.currency}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

