'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentStatusBadge } from '@/components/sales/DocumentStatusBadge';
import { DocumentTotals } from '@/components/sales/DocumentTotals';
import { toast } from 'sonner';

interface Quotation {
  id: string;
  document_number: string;
  customer_id: string;
  status: string;
  currency: string;
  subtotal: number;
  total_tax: number;
  total: number;
  valid_until?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  created_at: string;
  items?: QuotationItem[];
}

interface QuotationItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total: number;
  tax_amount: number;
}

export default function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetchQuotation(p.id);
    });
  }, [params]);

  const fetchQuotation = async (quotationId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/sales/quotations/${quotationId}`);
      const result = await response.json();

      if (result.success) {
        setQuotation(result.data);
      } else {
        toast.error('Failed to fetch quotation');
        router.push('/sales/quotations');
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast.error('Error loading quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToSalesOrder = async () => {
    if (!quotation) return;

    try {
      const response = await fetch(`/api/v1/sales/quotations/${quotation.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ created_by: 'current-user-id' }), // TODO: Get from auth
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Quotation converted to sales order');
        router.push(`/sales/sales-orders/${result.data.sales_order_id}`);
      } else {
        toast.error(result.error || 'Failed to convert quotation');
      }
    } catch (error) {
      console.error('Error converting quotation:', error);
      toast.error('Error converting quotation');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!quotation) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Quotation not found</div>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quotation.currency || 'ZAR',
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/sales/quotations')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{quotation.document_number}</h1>
              <p className="text-muted-foreground">Quotation Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            {quotation.status !== 'converted' && (
              <Button onClick={handleConvertToSalesOrder}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Convert to Sales Order
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent>
                {quotation.items && quotation.items.length > 0 ? (
                  <div className="space-y-4">
                    {quotation.items.map(item => (
                      <div key={item.id} className="flex justify-between border-b pb-4">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-muted-foreground text-sm">
                            {item.quantity} × {formatCurrency(item.unit_price)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(item.total)}</div>
                          {item.tax_amount > 0 && (
                            <div className="text-muted-foreground text-sm">
                              Tax: {formatCurrency(item.tax_amount)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center py-8">No items</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-muted-foreground text-sm">Status</div>
                  <div className="mt-1">
                    <DocumentStatusBadge status={quotation.status as any} type="quotation" />
                  </div>
                </div>
                {quotation.valid_until && (
                  <div>
                    <div className="text-muted-foreground text-sm">Valid Until</div>
                    <div className="mt-1">
                      {new Date(quotation.valid_until).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {quotation.reference_number && (
                  <div>
                    <div className="text-muted-foreground text-sm">Reference</div>
                    <div className="mt-1">{quotation.reference_number}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground text-sm">Created</div>
                  <div className="mt-1">
                    {new Date(quotation.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Totals</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentTotals
                  subtotal={quotation.subtotal}
                  totalTax={quotation.total_tax}
                  total={quotation.total}
                  currency={quotation.currency}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

