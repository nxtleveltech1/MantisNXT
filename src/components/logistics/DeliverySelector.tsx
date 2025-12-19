'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Package, DollarSign, Loader2 } from 'lucide-react';
import { CostComparison } from './CostComparison';
import type { Address, DeliveryServiceTier } from '@/types/logistics';

interface DeliverySelectorProps {
  quotationId?: string;
  salesOrderId?: string;
  onDeliverySelected?: (deliveryOptions: {
    delivery_address: Address;
    service_tier_id?: string;
    selected_cost_quote_id?: string;
    special_instructions?: string;
  }) => void;
  initialData?: {
    delivery_address?: Address;
    service_tier_id?: string;
    selected_cost_quote_id?: string;
    special_instructions?: string;
  };
}

export function DeliverySelector({
  quotationId,
  salesOrderId,
  onDeliverySelected,
  initialData,
}: DeliverySelectorProps) {
  const [enableDelivery, setEnableDelivery] = useState(!!initialData);
  const [deliveryAddress, setDeliveryAddress] = useState<Address>(
    initialData?.delivery_address || { formatted: '' }
  );
  const [deliveryContactName, setDeliveryContactName] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [serviceTier, setServiceTier] = useState<DeliveryServiceTier>('standard');
  const [specialInstructions, setSpecialInstructions] = useState(initialData?.special_instructions || '');
  const [packageWeight, setPackageWeight] = useState('');
  const [packageDimensions, setPackageDimensions] = useState({
    length: '',
    width: '',
    height: '',
  });
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(
    initialData?.selected_cost_quote_id
  );

  const handleGetQuotes = async () => {
    if (!deliveryAddress.formatted || !packageWeight) {
      alert('Please enter delivery address and package weight');
      return;
    }

    setLoadingQuotes(true);
    try {
      const response = await fetch('/api/v1/logistics/delivery-costs/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup_address: { formatted: 'Warehouse Address' }, // TODO: Get from org settings
          delivery_address: deliveryAddress,
          weight_kg: parseFloat(packageWeight),
          dimensions: packageDimensions.length
            ? {
                length_cm: parseFloat(packageDimensions.length),
                width_cm: parseFloat(packageDimensions.width),
                height_cm: parseFloat(packageDimensions.height),
              }
            : undefined,
          service_tier: serviceTier,
          quotation_id: quotationId,
          sales_order_id: salesOrderId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setQuotes(result.data.quotes || []);
      }
    } catch (error) {
      console.error('Error getting quotes:', error);
      alert('Failed to get delivery quotes');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleQuoteSelect = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    if (onDeliverySelected) {
      onDeliverySelected({
        delivery_address: deliveryAddress,
        service_tier_id: quotes.find((q) => q.id === quoteId)?.service_tier_id,
        selected_cost_quote_id: quoteId,
        special_instructions: specialInstructions,
      });
    }
  };

  if (!enableDelivery) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery Options</CardTitle>
          <CardDescription>Add courier delivery to this quotation</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setEnableDelivery(true)} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Add Delivery
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Options
          </span>
          <Button variant="ghost" size="sm" onClick={() => setEnableDelivery(false)}>
            Remove
          </Button>
        </CardTitle>
        <CardDescription>Configure courier delivery for this quotation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Address */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="delivery_address">Delivery Address *</Label>
            <Textarea
              id="delivery_address"
              value={deliveryAddress.formatted || ''}
              onChange={(e) =>
                setDeliveryAddress({ ...deliveryAddress, formatted: e.target.value })
              }
              placeholder="Enter full delivery address"
              rows={3}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delivery_contact_name">Contact Name</Label>
              <Input
                id="delivery_contact_name"
                value={deliveryContactName}
                onChange={(e) => setDeliveryContactName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="delivery_contact_phone">Contact Phone</Label>
              <Input
                id="delivery_contact_phone"
                type="tel"
                value={deliveryContactPhone}
                onChange={(e) => setDeliveryContactPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Package Information */}
        <div className="space-y-4">
          <Label>Package Information</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="package_weight">Weight (kg) *</Label>
              <Input
                id="package_weight"
                type="number"
                step="0.1"
                min="0"
                value={packageWeight}
                onChange={(e) => setPackageWeight(e.target.value)}
                placeholder="0.0"
                required
              />
            </div>
            <div>
              <Label htmlFor="service_tier">Service Tier</Label>
              <Select value={serviceTier} onValueChange={(value) => setServiceTier(value as DeliveryServiceTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (2-3 days)</SelectItem>
                  <SelectItem value="express">Express (1 day)</SelectItem>
                  <SelectItem value="urgent">Urgent (Same day)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dim_length">Length (cm)</Label>
              <Input
                id="dim_length"
                type="number"
                step="0.1"
                min="0"
                value={packageDimensions.length}
                onChange={(e) =>
                  setPackageDimensions({ ...packageDimensions, length: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="dim_width">Width (cm)</Label>
              <Input
                id="dim_width"
                type="number"
                step="0.1"
                min="0"
                value={packageDimensions.width}
                onChange={(e) =>
                  setPackageDimensions({ ...packageDimensions, width: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="dim_height">Height (cm)</Label>
              <Input
                id="dim_height"
                type="number"
                step="0.1"
                min="0"
                value={packageDimensions.height}
                onChange={(e) =>
                  setPackageDimensions({ ...packageDimensions, height: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Get Quotes Button */}
        <Button onClick={handleGetQuotes} disabled={loadingQuotes || !deliveryAddress.formatted || !packageWeight}>
          {loadingQuotes ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Getting Quotes...
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4 mr-2" />
              Get Delivery Quotes
            </>
          )}
        </Button>

        {/* Cost Comparison */}
        {quotes.length > 0 && (
          <CostComparison
            quotes={quotes}
            selectedQuoteId={selectedQuoteId}
            onQuoteSelect={handleQuoteSelect}
          />
        )}

        {/* Special Instructions */}
        <div>
          <Label htmlFor="special_instructions">Special Instructions</Label>
          <Textarea
            id="special_instructions"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special instructions for the courier..."
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}



