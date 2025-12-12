'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentStatusBadge } from '@/components/sales/DocumentStatusBadge';
import { toast } from 'sonner';

interface SalesOrder {
  id: string;
  document_number?: string | null;
  order_number?: string | null;
  customer_id?: string | null;
  customer_name?: string;
  status?: string | null;
  status_enum?: string | null;
  total?: number | null;
  currency?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/sales/sales-orders?limit=100');
      const result = await response.json();

      if (result.success) {
        setSalesOrders(result.data || []);
      } else {
        toast.error('Failed to fetch sales orders');
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      toast.error('Error loading sales orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = salesOrders.filter(order => {
    const docNum = order.document_number || order.order_number || '';
    const customerName = order.customer_name || '';
    const search = searchTerm.toLowerCase();
    return docNum.toLowerCase().includes(search) || customerName.toLowerCase().includes(search);
  });

  const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getStatus = (order: SalesOrder) => {
    return order.status_enum || order.status || 'draft';
  };

  const getDisplayNumber = (order: SalesOrder) => {
    return order.document_number || order.order_number || order.id.substring(0, 8);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Orders</h1>
            <p className="text-muted-foreground">Manage sales orders</p>
          </div>
          <Button onClick={() => router.push('/sales/sales-orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Sales Order
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Sales Orders</CardTitle>
                <CardDescription>View and manage all sales orders</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-64 pl-8"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchSalesOrders}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-muted-foreground">No sales orders found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/sales/sales-orders/new')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Sales Order
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/sales/sales-orders/${order.id}`)}
                    >
                      <TableCell className="font-medium">{getDisplayNumber(order)}</TableCell>
                      <TableCell>{order.customer_name || order.customer_id || '-'}</TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={getStatus(order) as any} type="sales-order" />
                      </TableCell>
                      <TableCell>{formatCurrency(order.total, order.currency)}</TableCell>
                      <TableCell>
                        {order.created_at || order.modified_at
                          ? new Date(order.created_at || order.modified_at!).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            router.push(`/sales/sales-orders/${order.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

