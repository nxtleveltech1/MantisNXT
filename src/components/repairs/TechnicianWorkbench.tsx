'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RepairOrder } from '@/types/repairs';
import { useToast } from '@/hooks/use-toast';

interface TechnicianWorkbenchProps {
  technicianId: string;
}

export function TechnicianWorkbench({ technicianId }: TechnicianWorkbenchProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [technicianId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/repairs/orders?assigned_technician_id=${technicianId}`);
      const result = await response.json();
      if (result.success) {
        setOrders(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const inProgress = orders.filter((o) => o.status === 'in_progress');
  const waitingParts = orders.filter((o) => o.status === 'waiting_parts');
  const testing = orders.filter((o) => o.status === 'testing');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technician Workbench</CardTitle>
        <CardDescription>Your assigned repair orders</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="in_progress" className="space-y-4">
          <TabsList>
            <TabsTrigger value="in_progress">
              In Progress ({inProgress.length})
            </TabsTrigger>
            <TabsTrigger value="waiting_parts">
              Waiting Parts ({waitingParts.length})
            </TabsTrigger>
            <TabsTrigger value="testing">
              Testing ({testing.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in_progress">
            <div className="space-y-2">
              {inProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders in progress</p>
              ) : (
                inProgress.map((order) => (
                  <div
                    key={order.repair_order_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{order.repair_order_number}</p>
                      <p className="text-sm text-muted-foreground">{order.reported_issue}</p>
                    </div>
                    <Badge>{order.priority}</Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="waiting_parts">
            <div className="space-y-2">
              {waitingParts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders waiting for parts</p>
              ) : (
                waitingParts.map((order) => (
                  <div
                    key={order.repair_order_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{order.repair_order_number}</p>
                      <p className="text-sm text-muted-foreground">{order.reported_issue}</p>
                    </div>
                    <Badge variant="outline">Waiting Parts</Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="testing">
            <div className="space-y-2">
              {testing.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders in testing</p>
              ) : (
                testing.map((order) => (
                  <div
                    key={order.repair_order_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{order.repair_order_number}</p>
                      <p className="text-sm text-muted-foreground">{order.reported_issue}</p>
                    </div>
                    <Badge variant="secondary">Testing</Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

