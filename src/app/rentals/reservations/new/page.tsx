'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Equipment } from '@/types/rentals';

interface ReservationItem {
  equipment_id: string;
  equipment_name: string;
  quantity: number;
  daily_rate: number;
}

export default function NewReservationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    event_name: '',
    event_type: '',
    event_date_start: '',
    event_date_end: '',
    rental_start_date: '',
    rental_end_date: '',
    delivery_required: false,
    delivery_address: '',
    setup_required: false,
  });

  const [items, setItems] = useState<ReservationItem[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch customers
      const customersRes = await fetch('/api/v1/customers?limit=100');
      const customersData = await customersRes.json();
      if (customersData.success) {
        setCustomers(customersData.data || []);
      }

      // Fetch available equipment
      const equipmentRes = await fetch('/api/rentals/equipment?availability_status=available&limit=100');
      const equipmentData = await equipmentRes.json();
      if (equipmentData.success) {
        setAvailableEquipment(equipmentData.data || []);
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

  const addItem = () => {
    if (!selectedEquipmentId) {
      toast({
        title: 'Error',
        description: 'Please select equipment',
        variant: 'destructive',
      });
      return;
    }

    const equipment = availableEquipment.find(e => e.equipment_id === selectedEquipmentId);
    if (!equipment) return;

    const dailyRate = equipment.rental_rate_daily || 0;
    
    setItems([...items, {
      equipment_id: selectedEquipmentId,
      equipment_name: equipment.name,
      quantity: selectedQuantity,
      daily_rate: dailyRate,
    }]);

    setSelectedEquipmentId('');
    setSelectedQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    if (!formData.rental_start_date || !formData.rental_end_date) return 0;
    
    const start = new Date(formData.rental_start_date);
    const end = new Date(formData.rental_end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return items.reduce((sum, item) => sum + (item.daily_rate * item.quantity * days), 0);
  };

  const handleSubmit = async () => {
    if (!formData.customer_id) {
      toast({
        title: 'Error',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one equipment item',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.rental_start_date || !formData.rental_end_date) {
      toast({
        title: 'Error',
        description: 'Please select rental dates',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/rentals/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: items.map(item => ({
            equipment_id: item.equipment_id,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Reservation created successfully',
        });
        router.push(`/rentals/reservations/${result.data.reservation_id}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create reservation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { label: 'Rentals', href: '/rentals' },
    { label: 'Reservations', href: '/rentals/reservations' },
    { label: 'New Reservation' },
  ];

  return (
    <AppLayout title="New Reservation" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">New Reservation</h1>
          </div>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Creating...' : 'Create Reservation'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer & Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer *</Label>
                <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_name">Event Name</Label>
                <Input
                  id="event_name"
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                  placeholder="Corporate event, wedding, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_type">Event Type</Label>
                <Input
                  id="event_type"
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  placeholder="corporate, wedding, concert, etc."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rental Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rental_start_date">Rental Start Date *</Label>
                <Input
                  id="rental_start_date"
                  type="date"
                  value={formData.rental_start_date}
                  onChange={(e) => setFormData({ ...formData, rental_start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rental_end_date">Rental End Date *</Label>
                <Input
                  id="rental_end_date"
                  type="date"
                  value={formData.rental_end_date}
                  onChange={(e) => setFormData({ ...formData, rental_end_date: e.target.value })}
                />
              </div>
              {formData.rental_start_date && formData.rental_end_date && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">
                    Total Days: {Math.ceil(
                      (new Date(formData.rental_end_date).getTime() - new Date(formData.rental_start_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Estimated Total: R {calculateTotal().toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipment</CardTitle>
            <CardDescription>Add equipment to this reservation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {availableEquipment.map((eq) => (
                    <SelectItem key={eq.equipment_id} value={eq.equipment_id}>
                      {eq.name} - R {eq.rental_rate_daily?.toFixed(2) || '0.00'}/day
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                className="w-24"
                placeholder="Qty"
              />
              <Button onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{item.equipment_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} × R {item.daily_rate.toFixed(2)}/day
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery & Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="delivery_required"
                checked={formData.delivery_required}
                onChange={(e) => setFormData({ ...formData, delivery_required: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="delivery_required">Delivery Required</Label>
            </div>
            {formData.delivery_required && (
              <div className="space-y-2">
                <Label htmlFor="delivery_address">Delivery Address</Label>
                <Textarea
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                  placeholder="Enter delivery address"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="setup_required"
                checked={formData.setup_required}
                onChange={(e) => setFormData({ ...formData, setup_required: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="setup_required">Setup Required</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

