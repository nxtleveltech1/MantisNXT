'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RepairOrder } from '@/types/repairs';

export default function RepairOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/repairs/orders');
      const result = await response.json();

      if (result.success) {
        setOrders(result.data || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load repair orders',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching repair orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load repair orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.repair_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.reported_issue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      received: 'bg-gray-500',
      diagnosed: 'bg-blue-500',
      in_progress: 'bg-yellow-500',
      waiting_parts: 'bg-orange-500',
      testing: 'bg-purple-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const breadcrumbs = [{ label: 'Repairs', href: '/repairs' }, { label: 'Repair Orders' }];

  return (
    <AppLayout title="Repair Orders" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Repair Orders</h1>
          <Button onClick={() => router.push('/repairs/orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Repair Order
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Repair Orders</CardTitle>
            <CardDescription>Manage repair work orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search repair orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No repair orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.repair_order_id}>
                        <TableCell className="font-medium">{order.repair_order_number}</TableCell>
                        <TableCell className="max-w-md truncate">{order.reported_issue}</TableCell>
                        <TableCell>{order.order_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/repairs/orders/${order.repair_order_id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

