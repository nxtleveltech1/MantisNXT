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

interface SalesOrder {
  id: string;
  document_number?: string | null;
  order_number?: string | null;
  customer_id?: string | null;
  status_enum?: string | null;
  status?: string | null;
  currency?: string | null;
  total?: number | null;
  total_tax?: number | null;
  items?: any[];
}

export default function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetchSalesOrder(p.id);
    });
  }, [params]);

  const fetchSalesOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/sales/sales-orders/${orderId}`);
      const result = await response.json();

      if (result.success) {
        setSalesOrder(result.data);
      } else {
        toast.error('Failed to fetch sales order');
        router.push('/sales/sales-orders');
      }
    } catch (error) {
      console.error('Error fetching sales order:', error);
      toast.error('Error loading sales order');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToProforma = async () => {
    if (!salesOrder) return;

    try {
      const response = await fetch(`/api/v1/sales/sales-orders/${salesOrder.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ created_by: 'current-user-id' }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Sales order converted to proforma invoice');
        router.push(`/sales/proforma-invoices/${result.data.proforma_invoice_id}`);
      } else {
        toast.error(result.error || 'Failed to convert sales order');
      }
    } catch (error) {
      console.error('Error converting sales order:', error);
      toast.error('Error converting sales order');
    }
  };

  if (loading || !salesOrder) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  const displayNumber = salesOrder.document_number || salesOrder.order_number || salesOrder.id.substring(0, 8);
  const status = salesOrder.status_enum || salesOrder.status || 'draft';
  const total = salesOrder.total || 0;
  const totalTax = salesOrder.total_tax || 0;
  const subtotal = total - totalTax;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/sales/sales-orders')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{displayNumber}</h1>
              <p className="text-muted-foreground">Sales Order Details</p>
            </div>
          </div>
          <Button onClick={handleConvertToProforma}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Convert to Proforma Invoice
          </Button>
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
                  <DocumentStatusBadge status={status as any} type="sales-order" />
                </div>
              </div>
              <DocumentTotals
                subtotal={subtotal}
                totalTax={totalTax}
                total={total}
                currency={salesOrder.currency || 'ZAR'}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

