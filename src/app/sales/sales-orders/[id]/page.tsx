'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentStatusBadge } from '@/components/sales/DocumentStatusBadge';
import { DocumentTotals } from '@/components/sales/DocumentTotals';
import { DropshippingIndicator } from '@/components/logistics/DropshippingIndicator';
import { toast } from 'sonner';
import { Package, MapPin, Truck } from 'lucide-react';
import Link from 'next/link';

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
  delivery?: {
    id: string;
    delivery_number: string;
    status: string;
    tracking_number?: string;
    delivery_address?: any;
    estimated_delivery_date?: string;
    is_dropshipping?: boolean;
    supplier_id?: string;
  };
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
        const orderData = result.data;
        
        // Fetch delivery information if sales_order_id exists
        if (orderData.id) {
          try {
            const deliveryResponse = await fetch(
              `/api/v1/logistics/deliveries?sales_order_id=${orderData.id}`
            );
            const deliveryResult = await deliveryResponse.json();
            if (deliveryResult.success && deliveryResult.data.length > 0) {
              orderData.delivery = deliveryResult.data[0];
            }
          } catch (deliveryError) {
            console.error('Error fetching delivery:', deliveryError);
            // Don't fail if delivery fetch fails
          }
        }
        
        setSalesOrder(orderData);
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

        {/* Delivery Information */}
        {salesOrder.delivery && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-muted-foreground text-sm">Delivery Number</div>
                    <div className="font-medium">{salesOrder.delivery.delivery_number}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {salesOrder.delivery.is_dropshipping && (
                      <DropshippingIndicator isDropshipping={true} />
                    )}
                    <DocumentStatusBadge status={salesOrder.delivery.status as any} type="delivery" />
                  </div>
                </div>

                {salesOrder.delivery.tracking_number && (
                  <div>
                    <div className="text-muted-foreground text-sm">Tracking Number</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono">{salesOrder.delivery.tracking_number}</span>
                      <Link href={`/logistics/tracking/${salesOrder.delivery.tracking_number}`}>
                        <Button variant="outline" size="sm">
                          <Truck className="h-4 w-4 mr-2" />
                          Track
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {salesOrder.delivery.delivery_address && (
                  <div>
                    <div className="text-muted-foreground text-sm flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Delivery Address
                    </div>
                    <div className="mt-1">
                      {typeof salesOrder.delivery.delivery_address === 'object'
                        ? salesOrder.delivery.delivery_address.formatted ||
                          JSON.stringify(salesOrder.delivery.delivery_address)
                        : salesOrder.delivery.delivery_address}
                    </div>
                  </div>
                )}

                {salesOrder.delivery.estimated_delivery_date && (
                  <div>
                    <div className="text-muted-foreground text-sm">Estimated Delivery</div>
                    <div className="mt-1">
                      {new Date(salesOrder.delivery.estimated_delivery_date).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div>
                  <Link href={`/logistics/deliveries/${salesOrder.delivery.id}`}>
                    <Button variant="outline" className="w-full">
                      View Delivery Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

