// UPDATE: [2025-01-27] Complete reservation creation form with equipment selection, financial breakdown, and contract generation
// UPDATE: 2025-01-27 Fixed type errors with DECIMAL fields and added equipment seeding from user-provided list
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

      // Fetch all active equipment
      const equipmentRes = await fetch('/api/rentals/equipment?limit=1000');
      const equipmentData = await equipmentRes.json();
      console.log('Equipment API response:', equipmentData);
      if (equipmentData.success) {
        const equipment = equipmentData.data || [];
        console.log('Equipment fetched:', equipment.length, 'items');
        // Show all active equipment (don't filter by availability_status - show all for selection)
        setAvailableEquipment(equipment.filter((eq: Equipment) => eq.is_active !== false));
      } else {
        console.error('Equipment fetch failed:', equipmentData);
        toast({
          title: 'Warning',
          description: 'Failed to load equipment: ' + (equipmentData.error || 'Unknown error'),
          variant: 'destructive',
        });
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

    const dailyRate = Number(equipment.rental_rate_daily) || 0;
    
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

  const calculateFinancials = () => {
    if (!formData.rental_start_date || !formData.rental_end_date) {
      return {
        days: 0,
        subtotal: 0,
        deliveryCost: formData.delivery_required ? 500 : 0, // Default delivery cost
        setupCost: formData.setup_required ? 300 : 0, // Default setup cost
        taxRate: 0.15, // 15% VAT
        taxAmount: 0,
        totalSecurityDeposit: 0,
        totalAmount: 0,
      };
    }
    
    const start = new Date(formData.rental_start_date);
    const end = new Date(formData.rental_end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const subtotal = items.reduce((sum, item) => {
      const equipment = availableEquipment.find(e => e.equipment_id === item.equipment_id);
      const dailyRate = Number(equipment?.rental_rate_daily) || Number(item.daily_rate) || 0;
      return sum + (dailyRate * item.quantity * days);
    }, 0);
    
    const deliveryCost = formData.delivery_required ? 500 : 0;
    const setupCost = formData.setup_required ? 300 : 0;
    const totalBeforeTax = subtotal + deliveryCost + setupCost;
    const taxRate = 0.15; // 15% VAT
    const taxAmount = totalBeforeTax * taxRate;
    const totalAmount = totalBeforeTax + taxAmount;
    
    // Calculate total security deposit
    const totalSecurityDeposit = items.reduce((sum, item) => {
      const equipment = availableEquipment.find(e => e.equipment_id === item.equipment_id);
      const deposit = Number(equipment?.security_deposit) || 0;
      return sum + (deposit * item.quantity);
    }, 0);
    
    return {
      days,
      subtotal,
      deliveryCost,
      setupCost,
      taxRate,
      taxAmount,
      totalSecurityDeposit,
      totalAmount,
    };
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
              {formData.rental_start_date && formData.rental_end_date && items.length > 0 && (
                <div className="rounded-lg bg-muted p-3 space-y-1">
                  <p className="text-sm font-medium">
                    Rental Period: {calculateFinancials().days} day(s)
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
              <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId} disabled={loading || availableEquipment.length === 0}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loading ? "Loading equipment..." : availableEquipment.length === 0 ? "No equipment available - Add equipment first" : "Select equipment"} />
                </SelectTrigger>
                <SelectContent>
                  {availableEquipment.length === 0 ? (
                    <SelectItem value="none" disabled>No equipment available</SelectItem>
                  ) : (
                    availableEquipment.map((eq) => (
                      <SelectItem key={eq.equipment_id} value={eq.equipment_id}>
                        {eq.name} - R {(Number(eq.rental_rate_daily) || 0).toFixed(2)}/day
                      </SelectItem>
                    ))
                  )}
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
                        Quantity: {item.quantity} × R {(Number(item.daily_rate) || 0).toFixed(2)}/day
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
              <Label htmlFor="delivery_required">Delivery Required (R 500.00)</Label>
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
              <Label htmlFor="setup_required">Setup Required (R 300.00)</Label>
            </div>
          </CardContent>
        </Card>

        {/* Financial Breakdown - Show when dates are set, even without items */}
        {formData.rental_start_date && formData.rental_end_date && (
          <Card>
            <CardHeader>
              <CardTitle>Financial Breakdown</CardTitle>
              <CardDescription>Rental cost calculation and contract summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {items.length > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Equipment Rental ({calculateFinancials().days} days)</span>
                    <span className="font-medium">R {calculateFinancials().subtotal.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Equipment Rental ({calculateFinancials().days} days)</span>
                    <span>R 0.00 - Add equipment to calculate</span>
                  </div>
                )}
                {formData.delivery_required && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium">R {calculateFinancials().deliveryCost.toFixed(2)}</span>
                  </div>
                )}
                {formData.setup_required && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Setup</span>
                    <span className="font-medium">R {calculateFinancials().setupCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    R {(calculateFinancials().subtotal + calculateFinancials().deliveryCost + calculateFinancials().setupCost).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT ({(calculateFinancials().taxRate * 100).toFixed(0)}%)</span>
                  <span className="font-medium">R {calculateFinancials().taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Rental Amount</span>
                  <span>R {calculateFinancials().totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Security Deposit Required</span>
                  <span className="font-medium text-orange-600">R {calculateFinancials().totalSecurityDeposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total Amount Due</span>
                  <span className="text-primary">
                    R {(calculateFinancials().totalAmount + calculateFinancials().totalSecurityDeposit).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 mt-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> A rental agreement/contract will be automatically generated upon reservation creation.
                  The security deposit will be refunded upon return of equipment in good condition.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

