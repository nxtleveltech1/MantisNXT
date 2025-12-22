'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Wrench, Clock, CheckCircle2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RepairOrder, RepairOrderItem } from '@/types/repairs';

export default function RepairOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const repairOrderId = params?.id as string;
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [items, setItems] = useState<RepairOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState('');

  useEffect(() => {
    if (repairOrderId) {
      fetchRepairOrder();
    }
  }, [repairOrderId]);

  const fetchRepairOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/repairs/orders/${repairOrderId}`);
      const result = await response.json();

      if (result.success) {
        setOrder(result.data);
        setItems(result.data.items || []);
        setDiagnosis(result.data.diagnosis || '');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load repair order',
          variant: 'destructive',
        });
        router.push('/repairs/orders');
      }
    } catch (error) {
      console.error('Error fetching repair order:', error);
      toast({
        title: 'Error',
        description: 'Failed to load repair order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDiagnosis = async () => {
    if (!diagnosis.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a diagnosis',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/repairs/orders/${repairOrderId}/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosis }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Diagnosis added successfully',
        });
        fetchRepairOrder();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add diagnosis',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = async () => {
    try {
      const response = await fetch(`/api/repairs/orders/${repairOrderId}/complete`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Repair order completed',
        });
        fetchRepairOrder();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete repair order',
        variant: 'destructive',
      });
    }
  };

  if (loading || !order) {
    return (
      <AppLayout title="Repair Order Details" breadcrumbs={[]}>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

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

  const breadcrumbs = [
    { label: 'Repairs', href: '/repairs' },
    { label: 'Repair Orders', href: '/repairs/orders' },
    { label: order.repair_order_number },
  ];

  return (
    <AppLayout title={`Repair Order ${order.repair_order_number}`} breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{order.repair_order_number}</h1>
              <p className="text-muted-foreground">{order.order_type}</p>
            </div>
          </div>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <Button onClick={handleComplete}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete Repair
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{order.priority}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(order.total_cost)}</div>
              <p className="text-sm text-muted-foreground">
                Labor: {formatCurrency(order.labor_cost)} | Parts: {formatCurrency(order.parts_cost)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Labor Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{order.labor_hours || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
            <TabsTrigger value="parts">Parts</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Repair Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reported Issue</p>
                  <p className="text-lg">{order.reported_issue}</p>
                </div>
                {order.diagnosis && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
                    <p className="text-lg">{order.diagnosis}</p>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {order.estimated_completion_date && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Estimated Completion
                      </p>
                      <p className="text-lg">{formatDate(order.estimated_completion_date)}</p>
                    </div>
                  )}
                  {order.actual_completion_date && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Actual Completion</p>
                      <p className="text-lg">{formatDate(order.actual_completion_date)}</p>
                    </div>
                  )}
                </div>
                {order.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnosis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis</CardTitle>
                <CardDescription>Add or update diagnosis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.diagnosis ? (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Diagnosis</p>
                    <p className="text-lg">{order.diagnosis}</p>
                    {order.diagnosed_at && (
                      <p className="text-sm text-muted-foreground">
                        Diagnosed: {formatDate(order.diagnosed_at)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Enter diagnosis..."
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      rows={5}
                    />
                    <Button onClick={handleAddDiagnosis}>Add Diagnosis</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Parts Used</CardTitle>
                <CardDescription>Parts consumed in this repair</CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No parts used yet</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.repair_item_id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{item.part_name || 'Unknown Part'}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} × {formatCurrency(item.unit_cost || 0)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.line_total)}</p>
                        </div>
                      </div>
                    ))}
                    <div className="mt-4 border-t pt-4">
                      <div className="flex justify-between">
                        <span className="font-medium">Total Parts Cost</span>
                        <span className="font-bold">{formatCurrency(order.parts_cost)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Repair Timeline</CardTitle>
                <CardDescription>Status history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Received</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                  {order.diagnosed_at && (
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Diagnosed</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.diagnosed_at)}
                        </p>
                      </div>
                    </div>
                  )}
                  {order.actual_completion_date && (
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Completed</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.actual_completion_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

