// UPDATE: [2025-01-27] Added SKU field to equipment form and fixed redirect after creation
'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Equipment } from '@/types/rentals';

export default function EquipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const equipmentId = params?.id as string;
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    equipment_type: '',
    brand: '',
    model: '',
    serial_number: '',
    rental_rate_daily: '',
    rental_rate_weekly: '',
    rental_rate_monthly: '',
    security_deposit: '',
    condition_status: 'excellent' as const,
    availability_status: 'available' as const,
  });

  useEffect(() => {
    if (equipmentId && equipmentId !== 'new') {
      fetchEquipment();
    } else {
      setLoading(false);
      setEditing(true);
    }
  }, [equipmentId]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rentals/equipment/${equipmentId}`);
      const result = await response.json();

      if (result.success) {
        const eq = result.data;
        setEquipment(eq);
        setFormData({
          sku: eq.sku || '',
          name: eq.name || '',
          equipment_type: eq.equipment_type || '',
          brand: eq.brand || '',
          model: eq.model || '',
          serial_number: eq.serial_number || '',
          rental_rate_daily: eq.rental_rate_daily?.toString() || '',
          rental_rate_weekly: eq.rental_rate_weekly?.toString() || '',
          rental_rate_monthly: eq.rental_rate_monthly?.toString() || '',
          security_deposit: eq.security_deposit?.toString() || '',
          condition_status: eq.condition_status || 'excellent',
          availability_status: eq.availability_status || 'available',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load equipment',
          variant: 'destructive',
        });
        router.push('/rentals/equipment');
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load equipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload: any = {
        sku: formData.sku,
        name: formData.name,
        equipment_type: formData.equipment_type,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        serial_number: formData.serial_number || undefined,
        rental_rate_daily: formData.rental_rate_daily ? parseFloat(formData.rental_rate_daily) : undefined,
        rental_rate_weekly: formData.rental_rate_weekly ? parseFloat(formData.rental_rate_weekly) : undefined,
        rental_rate_monthly: formData.rental_rate_monthly ? parseFloat(formData.rental_rate_monthly) : undefined,
        security_deposit: formData.security_deposit ? parseFloat(formData.security_deposit) : undefined,
        condition_status: formData.condition_status,
        availability_status: formData.availability_status,
      };

      const url = equipmentId === 'new' 
        ? '/api/rentals/equipment'
        : `/api/rentals/equipment/${equipmentId}`;
      
      const method = equipmentId === 'new' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: equipmentId === 'new' ? 'Equipment created' : 'Equipment updated',
        });
        if (equipmentId === 'new') {
          router.push(`/rentals/equipment`);
        } else {
          setEditing(false);
          fetchEquipment();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save equipment',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <AppLayout title="Equipment Details" breadcrumbs={[]}>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  const breadcrumbs = [
    { label: 'Rentals', href: '/rentals' },
    { label: 'Equipment', href: '/rentals/equipment' },
    { label: equipmentId === 'new' ? 'New Equipment' : equipment?.name || 'Equipment' },
  ];

  return (
    <AppLayout title={equipmentId === 'new' ? 'New Equipment' : `Equipment: ${equipment?.name}`} breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {equipment && !editing && (
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{equipment.name}</h1>
                <p className="text-muted-foreground">{equipment.equipment_type}</p>
              </div>
            )}
            {editing && <h1 className="text-3xl font-bold tracking-tight">{equipmentId === 'new' ? 'New Equipment' : 'Edit Equipment'}</h1>}
          </div>
          <div className="flex gap-2">
            {equipment && !editing && (
              <Button onClick={() => setEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {editing && (
              <>
                <Button variant="outline" onClick={() => {
                  setEditing(false);
                  if (equipment) fetchEquipment();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle>Equipment Details</CardTitle>
              <CardDescription>Enter equipment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="EQUIP-001"
                    disabled={equipmentId !== 'new'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Equipment name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equipment_type">Type *</Label>
                  <Input
                    id="equipment_type"
                    value={formData.equipment_type}
                    onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                    placeholder="camera, microphone, speaker, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rental_rate_daily">Daily Rate (ZAR)</Label>
                  <Input
                    id="rental_rate_daily"
                    type="number"
                    value={formData.rental_rate_daily}
                    onChange={(e) => setFormData({ ...formData, rental_rate_daily: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rental_rate_weekly">Weekly Rate (ZAR)</Label>
                  <Input
                    id="rental_rate_weekly"
                    type="number"
                    value={formData.rental_rate_weekly}
                    onChange={(e) => setFormData({ ...formData, rental_rate_weekly: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rental_rate_monthly">Monthly Rate (ZAR)</Label>
                  <Input
                    id="rental_rate_monthly"
                    type="number"
                    value={formData.rental_rate_monthly}
                    onChange={(e) => setFormData({ ...formData, rental_rate_monthly: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security_deposit">Security Deposit (ZAR)</Label>
                  <Input
                    id="security_deposit"
                    type="number"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition_status">Condition</Label>
                  <select
                    id="condition_status"
                    value={formData.condition_status}
                    onChange={(e) => setFormData({ ...formData, condition_status: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability_status">Availability</Label>
                  <select
                    id="availability_status"
                    value={formData.availability_status}
                    onChange={(e) => setFormData({ ...formData, availability_status: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="available">Available</option>
                    <option value="rented">Rented</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : equipment ? (
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="specs">Technical Specs</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">SKU</span>
                      <span className="font-medium">{equipment.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <span className="font-medium">{equipment.equipment_type}</span>
                    </div>
                    {equipment.brand && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Brand</span>
                        <span className="font-medium">{equipment.brand}</span>
                      </div>
                    )}
                    {equipment.model && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Model</span>
                        <span className="font-medium">{equipment.model}</span>
                      </div>
                    )}
                    {equipment.serial_number && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Serial Number</span>
                        <span className="font-medium">{equipment.serial_number}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rental Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge>{equipment.availability_status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Condition</span>
                      <Badge variant="outline">{equipment.condition_status}</Badge>
                    </div>
                    {equipment.rental_rate_daily && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Daily Rate</span>
                        <span className="font-medium">R {equipment.rental_rate_daily.toFixed(2)}</span>
                      </div>
                    )}
                    {equipment.security_deposit && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Security Deposit</span>
                        <span className="font-medium">R {equipment.security_deposit.toFixed(2)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="specs">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  {equipment.technical_specs && Object.keys(equipment.technical_specs).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(equipment.technical_specs).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm text-muted-foreground">{key}</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No technical specifications available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Equipment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">History tracking coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </AppLayout>
  );
}

