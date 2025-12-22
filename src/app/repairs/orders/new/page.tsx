'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Equipment } from '@/types/rentals';

export default function NewRepairOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [technicians, setTechnicians] = useState<Array<{ technician_id: string; employee_number?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    equipment_id: '',
    customer_id: '',
    order_type: 'repair' as const,
    priority: 'normal' as const,
    reported_issue: '',
    assigned_technician_id: '',
    estimated_completion_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch equipment
      const equipmentRes = await fetch('/api/rentals/equipment?limit=100');
      const equipmentData = await equipmentRes.json();
      if (equipmentData.success) {
        setEquipment(equipmentData.data || []);
      }

      // Fetch customers
      const customersRes = await fetch('/api/v1/customers?limit=100');
      const customersData = await customersRes.json();
      if (customersData.success) {
        setCustomers(customersData.data || []);
      }

      // Fetch technicians
      const techniciansRes = await fetch('/api/repairs/technicians');
      const techniciansData = await techniciansRes.json();
      if (techniciansData.success) {
        setTechnicians(techniciansData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.reported_issue.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the reported issue',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/repairs/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: formData.equipment_id || undefined,
          customer_id: formData.customer_id || undefined,
          order_type: formData.order_type,
          priority: formData.priority,
          reported_issue: formData.reported_issue,
          assigned_technician_id: formData.assigned_technician_id || undefined,
          estimated_completion_date: formData.estimated_completion_date || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Repair order created successfully',
        });
        router.push(`/repairs/orders/${result.data.repair_order_id}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create repair order',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { label: 'Repairs', href: '/repairs' },
    { label: 'Repair Orders', href: '/repairs/orders' },
    { label: 'New Repair Order' },
  ];

  return (
    <AppLayout title="New Repair Order" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">New Repair Order</h1>
          </div>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Creating...' : 'Create Repair Order'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Equipment & Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="equipment_id">Equipment (Optional)</Label>
                <Select
                  value={formData.equipment_id}
                  onValueChange={(value) => setFormData({ ...formData, equipment_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Customer-owned)</SelectItem>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.equipment_id} value={eq.equipment_id}>
                        {eq.name} - {eq.sku}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer (Optional)</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repair Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="order_type">Order Type *</Label>
                <Select
                  value={formData.order_type}
                  onValueChange={(value: any) => setFormData({ ...formData, order_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="calibration">Calibration</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_technician_id">Assign Technician</Label>
                <Select
                  value={formData.assigned_technician_id}
                  onValueChange={(value) => setFormData({ ...formData, assigned_technician_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.technician_id} value={tech.technician_id}>
                        {tech.employee_number || tech.technician_id.substring(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_completion_date">Estimated Completion</Label>
                <Input
                  id="estimated_completion_date"
                  type="date"
                  value={formData.estimated_completion_date}
                  onChange={(e) => setFormData({ ...formData, estimated_completion_date: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reported Issue *</CardTitle>
            <CardDescription>Describe the problem or issue</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.reported_issue}
              onChange={(e) => setFormData({ ...formData, reported_issue: e.target.value })}
              placeholder="Describe the issue..."
              rows={6}
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

