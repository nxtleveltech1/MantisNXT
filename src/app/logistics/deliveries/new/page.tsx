'use client';

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Package, User, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewDeliveryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    pickup_address: '',
    pickup_contact_name: '',
    pickup_contact_phone: '',
    delivery_address: '',
    delivery_contact_name: '',
    delivery_contact_phone: '',
    package_type: '',
    weight_kg: '',
    dimensions_length_cm: '',
    dimensions_width_cm: '',
    dimensions_height_cm: '',
    declared_value: '',
    priority: 'standard',
    special_instructions: '',
    requires_signature: false,
    is_fragile: false,
    is_insured: false,
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Parse addresses (simplified - in production, use proper address parsing)
      const pickupAddress = {
        formatted: formData.pickup_address,
        street: formData.pickup_address,
      };
      const deliveryAddress = {
        formatted: formData.delivery_address,
        street: formData.delivery_address,
      };

      const response = await fetch('/api/v1/logistics/deliveries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          pickup_address: pickupAddress,
          delivery_address: deliveryAddress,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
          dimensions_length_cm: formData.dimensions_length_cm
            ? parseFloat(formData.dimensions_length_cm)
            : undefined,
          dimensions_width_cm: formData.dimensions_width_cm
            ? parseFloat(formData.dimensions_width_cm)
            : undefined,
          dimensions_height_cm: formData.dimensions_height_cm
            ? parseFloat(formData.dimensions_height_cm)
            : undefined,
          declared_value: formData.declared_value ? parseFloat(formData.declared_value) : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Delivery created successfully');
        router.push(`/logistics/deliveries/${result.data.id}`);
      } else {
        toast.error(result.error || 'Failed to create delivery');
      }
    } catch (error) {
      console.error('Error creating delivery:', error);
      toast.error('Failed to create delivery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="New Delivery"
      breadcrumbs={[
        { label: 'Courier Logistics', href: '/logistics/dashboard' },
        { label: 'Deliveries', href: '/logistics/deliveries' },
        { label: 'New Delivery' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/logistics/deliveries">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deliveries
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create New Delivery</h1>
            <p className="text-muted-foreground">Schedule a new delivery request</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
              <CardDescription>Details of the person requesting the delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Full Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customer_phone">Phone Number *</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pickup Address
              </CardTitle>
              <CardDescription>Where the package will be collected from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pickup_address">Address *</Label>
                <Textarea
                  id="pickup_address"
                  value={formData.pickup_address}
                  onChange={(e) => handleInputChange('pickup_address', e.target.value)}
                  required
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pickup_contact_name">Contact Name</Label>
                  <Input
                    id="pickup_contact_name"
                    value={formData.pickup_contact_name}
                    onChange={(e) => handleInputChange('pickup_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pickup_contact_phone">Contact Phone</Label>
                  <Input
                    id="pickup_contact_phone"
                    type="tel"
                    value={formData.pickup_contact_phone}
                    onChange={(e) => handleInputChange('pickup_contact_phone', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                Delivery Address
              </CardTitle>
              <CardDescription>Where the package will be delivered to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="delivery_address">Address *</Label>
                <Textarea
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                  required
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery_contact_name">Contact Name</Label>
                  <Input
                    id="delivery_contact_name"
                    value={formData.delivery_contact_name}
                    onChange={(e) => handleInputChange('delivery_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_contact_phone">Contact Phone</Label>
                  <Input
                    id="delivery_contact_phone"
                    type="tel"
                    value={formData.delivery_contact_phone}
                    onChange={(e) => handleInputChange('delivery_contact_phone', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Package Information
              </CardTitle>
              <CardDescription>Details about the package being delivered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="package_type">Package Type</Label>
                  <Select
                    value={formData.package_type}
                    onValueChange={(value) => handleInputChange('package_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="documents">Documents</SelectItem>
                      <SelectItem value="parcel">Parcel</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="fragile">Fragile</SelectItem>
                      <SelectItem value="medical">Medical Supplies</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="weight_kg">Weight (kg)</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.weight_kg}
                    onChange={(e) => handleInputChange('weight_kg', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dimensions_length_cm">Length (cm)</Label>
                  <Input
                    id="dimensions_length_cm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.dimensions_length_cm}
                    onChange={(e) => handleInputChange('dimensions_length_cm', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions_width_cm">Width (cm)</Label>
                  <Input
                    id="dimensions_width_cm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.dimensions_width_cm}
                    onChange={(e) => handleInputChange('dimensions_width_cm', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions_height_cm">Height (cm)</Label>
                  <Input
                    id="dimensions_height_cm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.dimensions_height_cm}
                    onChange={(e) => handleInputChange('dimensions_height_cm', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="declared_value">Declared Value (ZAR)</Label>
                <Input
                  id="declared_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.declared_value}
                  onChange={(e) => handleInputChange('declared_value', e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires_signature"
                    checked={formData.requires_signature}
                    onCheckedChange={(checked) => handleInputChange('requires_signature', checked === true)}
                  />
                  <Label htmlFor="requires_signature" className="cursor-pointer">
                    Requires Signature
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_fragile"
                    checked={formData.is_fragile}
                    onCheckedChange={(checked) => handleInputChange('is_fragile', checked === true)}
                  />
                  <Label htmlFor="is_fragile" className="cursor-pointer">
                    Fragile Package
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_insured"
                    checked={formData.is_insured}
                    onCheckedChange={(checked) => handleInputChange('is_insured', checked === true)}
                  />
                  <Label htmlFor="is_insured" className="cursor-pointer">
                    Insure Package
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Delivery Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Priority</Label>
                <RadioGroup
                  value={formData.priority}
                  onValueChange={(value) => handleInputChange('priority', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="priority-standard" />
                    <Label htmlFor="priority-standard" className="cursor-pointer">
                      Standard
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="express" id="priority-express" />
                    <Label htmlFor="priority-express" className="cursor-pointer">
                      Express
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="urgent" id="priority-urgent" />
                    <Label htmlFor="priority-urgent" className="cursor-pointer">
                      Urgent
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={formData.special_instructions}
                  onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                  rows={3}
                  placeholder="Any special instructions for the courier provider..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href="/logistics/deliveries">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Delivery'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
