'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, ShoppingCart, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ChannelOrder {
  id: string;
  external_order_id: string;
  order_number?: string | null;
  order_status: string;
  internal_status?: string | null;
  sales_order_id?: string | null;
  customer_id?: string | null;
  currency: string;
  total_amount: number;
  payment_status?: string | null;
  synced_at: string;
  processed_at?: string | null;
  error_message?: string | null;
}

interface ChannelOrdersListProps {
  channelId: string;
}

export function ChannelOrdersList({ channelId }: ChannelOrdersListProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<ChannelOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [channelId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/sales-channels/${channelId}/orders`);
      const result = await response.json();

      if (result.success) {
        setOrders(result.data || []);
      } else {
        toast.error('Failed to fetch channel orders');
      }
    } catch (error) {
      console.error('Error fetching channel orders:', error);
      toast.error('Error loading channel orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOrders = async () => {
    try {
      setSyncing(true);
      const response = await fetch(`/api/v1/sales-channels/${channelId}/orders/sync`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Synced ${result.processed} orders`);
        fetchOrders();
      } else {
        toast.error(result.error || 'Failed to sync orders');
      }
    } catch (error) {
      console.error('Error syncing orders:', error);
      toast.error('Failed to sync orders');
    } finally {
      setSyncing(false);
    }
  };

  const handleProcessOrder = async (orderId: string) => {
    try {
      const response = await fetch(
        `/api/v1/sales-channels/${channelId}/orders/${orderId}`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Order processed successfully');
        fetchOrders();
        if (result.data.salesOrderId) {
          router.push(`/sales/sales-orders/${result.data.salesOrderId}`);
        }
      } else {
        toast.error(result.error || 'Failed to process order');
      }
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('Failed to process order');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('completed') || statusLower.includes('delivered')) {
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <CheckCircle2 className="h-3 w-3" />
          {status}
        </Badge>
      );
    }
    if (statusLower.includes('cancelled') || statusLower.includes('failed')) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredOrders = orders.filter(
    order =>
      order.external_order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Channel Orders</CardTitle>
            <CardDescription>Orders received from this sales channel</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleSyncOrders} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Orders'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Orders will appear here once synced from the channel'}
            </p>
            {!searchTerm && (
              <Button onClick={handleSyncOrders} disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Orders Now'}
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Internal Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Synced At</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      {order.external_order_id}
                    </TableCell>
                    <TableCell>{order.order_number || '-'}</TableCell>
                    <TableCell>{getStatusBadge(order.order_status)}</TableCell>
                    <TableCell>
                      {order.internal_status ? (
                        <Badge variant="outline">{order.internal_status}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(order.total_amount, order.currency)}
                    </TableCell>
                    <TableCell>
                      {order.payment_status ? (
                        <Badge variant="outline">{order.payment_status}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.synced_at)}
                    </TableCell>
                    <TableCell>
                      {order.processed_at ? (
                        <Badge variant="default" className="gap-1 bg-green-500">
                          <CheckCircle2 className="h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {order.sales_order_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/sales/sales-orders/${order.sales_order_id}`)}
                            title="View Sales Order"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {!order.processed_at && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProcessOrder(order.id)}
                          >
                            Process
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

