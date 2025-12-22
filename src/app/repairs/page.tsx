'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Plus, Wrench, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RepairOrder } from '@/types/repairs';

export default function RepairsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    waitingParts: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/repairs/orders?limit=10');
      const result = await response.json();

      if (result.success) {
        const orders = result.data || [];
        setRepairOrders(orders);
        setStats({
          total: orders.length,
          inProgress: orders.filter((o: RepairOrder) => o.status === 'in_progress').length,
          completed: orders.filter((o: RepairOrder) => o.status === 'completed').length,
          waitingParts: orders.filter((o: RepairOrder) => o.status === 'waiting_parts').length,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [{ label: 'Repairs' }];

  return (
    <AppLayout title="Repairs Workshop" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Repairs Workshop</h1>
          <Button onClick={() => router.push('/repairs/orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Repair Order
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting Parts</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.waitingParts}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Repair Orders</CardTitle>
            <CardDescription>Latest repair orders in the workshop</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : repairOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No repair orders found</div>
            ) : (
              <div className="space-y-2">
                {repairOrders.map((order) => (
                  <div
                    key={order.repair_order_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{order.repair_order_number}</p>
                      <p className="text-sm text-muted-foreground">{order.reported_issue}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{order.status}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/repairs/orders/${order.repair_order_id}`)}
                      >
                        View
                      </Button>
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

