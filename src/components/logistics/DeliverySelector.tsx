// UPDATE: [2025-12-25] Enhanced with structured address, insurance, signature, fragile options

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Package, DollarSign, Loader2, Shield, FileSignature, AlertTriangle, X } from 'lucide-react';
import { CostComparison } from './CostComparison';
import { AddressAutocomplete } from './AddressAutocomplete';
import { toast } from 'sonner';
import type { Address, DeliveryServiceTier, DeliveryCostQuote, DeliveryOptionsInput } from '@/types/logistics';

interface DeliverySelectorProps {
  quotationId?: string;
  salesOrderId?: string;
  onDeliverySelected?: (deliveryOptions: DeliveryOptionsInput | null) => void;
  initialData?: Partial<DeliveryOptionsInput>;
}

export function DeliverySelector({
  quotationId,
  salesOrderId,
  onDeliverySelected,
  initialData,
}: DeliverySelectorProps) {
  // Core state
  const [enableDelivery, setEnableDelivery] = useState(initialData?.enabled ?? false);
  
  // Address state
  const [deliveryAddress, setDeliveryAddress] = useState<Address>(
    initialData?.delivery_address || { formatted: '' }
  );
  const [deliveryContactName, setDeliveryContactName] = useState(
    initialData?.delivery_address?.contact_name || ''
  );
  const [deliveryContactPhone, setDeliveryContactPhone] = useState(
    initialData?.delivery_address?.contact_phone || ''
  );
  const [deliveryContactEmail, setDeliveryContactEmail] = useState(
    initialData?.delivery_address?.contact_email || ''
  );
  
  // Structured address fields
  const [streetAddress, setStreetAddress] = useState(initialData?.delivery_address?.street || '');
  const [suburb, setSuburb] = useState(initialData?.delivery_address?.suburb || '');
  const [city, setCity] = useState(initialData?.delivery_address?.city || '');
  const [province, setProvince] = useState(initialData?.delivery_address?.province || '');
  const [postalCode, setPostalCode] = useState(initialData?.delivery_address?.postalCode || '');

  // Package state
  const [packageWeight, setPackageWeight] = useState(initialData?.weight_kg?.toString() || '');
  const [packageDimensions, setPackageDimensions] = useState({
    length: initialData?.dimensions?.length_cm?.toString() || '',
    width: initialData?.dimensions?.width_cm?.toString() || '',
    height: initialData?.dimensions?.height_cm?.toString() || '',
  });
  const [packageDescription, setPackageDescription] = useState(initialData?.package_description || '');
  
  // Service options
  const [serviceTier, setServiceTier] = useState<DeliveryServiceTier>(
    initialData?.service_tier || 'standard'
  );
  const [specialInstructions, setSpecialInstructions] = useState(
    initialData?.special_instructions || ''
  );
  
  // Insurance & handling options
  const [declaredValue, setDeclaredValue] = useState(initialData?.declared_value?.toString() || '');
  const [isInsured, setIsInsured] = useState(initialData?.is_insured ?? false);
  const [requiresSignature, setRequiresSignature] = useState(initialData?.requires_signature ?? false);
  const [isFragile, setIsFragile] = useState(initialData?.is_fragile ?? false);

  // Quote state
  const [quotes, setQuotes] = useState<DeliveryCostQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(
    initialData?.selected_quote_id
  );
  const [selectedQuoteCost, setSelectedQuoteCost] = useState<number | undefined>(
    initialData?.selected_quote_cost
  );

  // Build structured address from individual fields or autocomplete
  const buildAddress = useCallback((): Address => {
    if (streetAddress || city) {
      return {
        street: streetAddress,
        suburb,
        city,
        province,
        postalCode,
        country: 'ZA',
        formatted: [streetAddress, suburb, city, province, postalCode].filter(Boolean).join(', '),
        lat: deliveryAddress.lat,
        lng: deliveryAddress.lng,
      };
    }
    return deliveryAddress;
  }, [streetAddress, suburb, city, province, postalCode, deliveryAddress]);

  // Handle address autocomplete selection
  const handleAddressChange = (address: Address) => {
    setDeliveryAddress(address);
    // Parse structured data if available
    if (address.street) setStreetAddress(address.street);
    if (address.suburb) setSuburb(address.suburb);
    if (address.city) setCity(address.city);
    if (address.province) setProvince(address.province);
    if (address.postalCode) setPostalCode(address.postalCode);
  };

  // Validate and get quotes
  const handleGetQuotes = async () => {
    const address = buildAddress();
    
    if (!address.formatted && !address.city) {
      toast.error('Please enter a delivery address');
      return;
    }
    
    if (!packageWeight || parseFloat(packageWeight) <= 0) {
      toast.error('Please enter a valid package weight');
      return;
    }

    setLoadingQuotes(true);
    setQuotes([]);
    
    try {
      const response = await fetch('/api/v1/logistics/delivery-costs/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup_address: { formatted: 'Warehouse Address' }, // TODO: Get from org settings
          delivery_address: address,
          delivery_contact: {
            name: deliveryContactName,
            phone: deliveryContactPhone,
            email: deliveryContactEmail,
          },
          weight_kg: parseFloat(packageWeight),
          dimensions: packageDimensions.length && packageDimensions.width && packageDimensions.height
            ? {
                length_cm: parseFloat(packageDimensions.length),
                width_cm: parseFloat(packageDimensions.width),
                height_cm: parseFloat(packageDimensions.height),
              }
            : undefined,
          service_tier: serviceTier,
          declared_value: declaredValue ? parseFloat(declaredValue) : undefined,
          package_description: packageDescription,
          requires_signature: requiresSignature,
          is_fragile: isFragile,
          is_insured: isInsured,
          quotation_id: quotationId,
          sales_order_id: salesOrderId,
        }),
      });

      const result = await response.json();
      
      if (result.success && result.data?.quotes) {
        setQuotes(result.data.quotes);
        if (result.data.quotes.length === 0) {
          toast.info('No delivery options available for this route');
        } else {
          toast.success(`Found ${result.data.quotes.length} delivery option(s)`);
        }
      } else {
        toast.error(result.error || 'Failed to get delivery quotes');
      }
    } catch (error) {
      console.error('Error getting quotes:', error);
      toast.error('Failed to connect to courier service');
    } finally {
      setLoadingQuotes(false);
    }
  };

  // Handle quote selection
  const handleQuoteSelect = (quoteId: string) => {
    const quote = quotes.find((q) => q.id === quoteId);
    setSelectedQuoteId(quoteId);
    setSelectedQuoteCost(quote?.cost);
    
    // Notify parent with complete delivery options
    notifyParent(quoteId, quote?.cost);
  };

  // Build and send delivery options to parent
  const notifyParent = (quoteId?: string, quoteCost?: number) => {
    if (!onDeliverySelected) return;
    
    if (!enableDelivery) {
      onDeliverySelected(null);
      return;
    }

    const address = buildAddress();
    
    onDeliverySelected({
      enabled: true,
      delivery_address: {
        ...address,
        contact_name: deliveryContactName,
        contact_phone: deliveryContactPhone,
        contact_email: deliveryContactEmail,
      },
      weight_kg: parseFloat(packageWeight) || 0,
      dimensions: packageDimensions.length && packageDimensions.width && packageDimensions.height
        ? {
            length_cm: parseFloat(packageDimensions.length),
            width_cm: parseFloat(packageDimensions.width),
            height_cm: parseFloat(packageDimensions.height),
          }
        : undefined,
      service_tier: serviceTier,
      package_description: packageDescription,
      declared_value: declaredValue ? parseFloat(declaredValue) : undefined,
      is_insured: isInsured,
      requires_signature: requiresSignature,
      is_fragile: isFragile,
      special_instructions: specialInstructions,
      selected_quote_id: quoteId || selectedQuoteId,
      selected_quote_cost: quoteCost || selectedQuoteCost,
    });
  };

  // Handle remove delivery
  const handleRemove = () => {
    setEnableDelivery(false);
    setQuotes([]);
    setSelectedQuoteId(undefined);
    setSelectedQuoteCost(undefined);
    onDeliverySelected?.(null);
  };

  // Collapsed state - show add button
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

  const isFormValid = (streetAddress || deliveryAddress.formatted) && packageWeight;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Options
          </span>
          <Button variant="ghost" size="sm" onClick={handleRemove}>
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </CardTitle>
        <CardDescription>Configure courier delivery for this quotation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Address Section */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Delivery Address</Label>
          
          {/* Address Autocomplete */}
          <AddressAutocomplete
            id="delivery_address"
            label="Search Address"
            value={deliveryAddress.formatted || ''}
            onAddressChange={handleAddressChange}
            placeholder="Start typing to search..."
          />
          
          {/* Structured Address Fields */}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="street_address">Street Address *</Label>
              <Input
                id="street_address"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="123 Main Street"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="Suburb"
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="province">Province</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gauteng">Gauteng</SelectItem>
                    <SelectItem value="Western Cape">Western Cape</SelectItem>
                    <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                    <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                    <SelectItem value="Free State">Free State</SelectItem>
                    <SelectItem value="Limpopo">Limpopo</SelectItem>
                    <SelectItem value="Mpumalanga">Mpumalanga</SelectItem>
                    <SelectItem value="North West">North West</SelectItem>
                    <SelectItem value="Northern Cape">Northern Cape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code *</Label>
                <Input
                  id="postal_code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="0000"
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="delivery_contact_name">Contact Name</Label>
              <Input
                id="delivery_contact_name"
                value={deliveryContactName}
                onChange={(e) => setDeliveryContactName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="delivery_contact_phone">Contact Phone</Label>
              <Input
                id="delivery_contact_phone"
                type="tel"
                value={deliveryContactPhone}
                onChange={(e) => setDeliveryContactPhone(e.target.value)}
                placeholder="+27 12 345 6789"
              />
            </div>
            <div>
              <Label htmlFor="delivery_contact_email">Contact Email</Label>
              <Input
                id="delivery_contact_email"
                type="email"
                value={deliveryContactEmail}
                onChange={(e) => setDeliveryContactEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>

        {/* Package Information Section */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Package Information</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="package_weight">Weight (kg) *</Label>
              <Input
                id="package_weight"
                type="number"
                step="0.1"
                min="0.1"
                value={packageWeight}
                onChange={(e) => setPackageWeight(e.target.value)}
                placeholder="0.0"
                required
              />
            </div>
            <div>
              <Label htmlFor="service_tier">Service Tier</Label>
              <Select 
                value={serviceTier} 
                onValueChange={(value) => setServiceTier(value as DeliveryServiceTier)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (2-3 days)</SelectItem>
                  <SelectItem value="express">Express (Next day)</SelectItem>
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
                onChange={(e) => setPackageDimensions({ ...packageDimensions, length: e.target.value })}
                placeholder="30"
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
                onChange={(e) => setPackageDimensions({ ...packageDimensions, width: e.target.value })}
                placeholder="20"
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
                onChange={(e) => setPackageDimensions({ ...packageDimensions, height: e.target.value })}
                placeholder="15"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="package_description">Package Description</Label>
            <Input
              id="package_description"
              value={packageDescription}
              onChange={(e) => setPackageDescription(e.target.value)}
              placeholder="Brief description of contents"
            />
          </div>
        </div>

        {/* Shipping Options Section */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Shipping Options</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="declared_value">Declared Value (ZAR)</Label>
              <Input
                id="declared_value"
                type="number"
                step="0.01"
                min="0"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                For insurance purposes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="is_insured"
                checked={isInsured}
                onCheckedChange={setIsInsured}
              />
              <Label htmlFor="is_insured" className="flex items-center gap-2 cursor-pointer">
                <Shield className="h-4 w-4 text-blue-500" />
                Insurance
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Switch
                id="requires_signature"
                checked={requiresSignature}
                onCheckedChange={setRequiresSignature}
              />
              <Label htmlFor="requires_signature" className="flex items-center gap-2 cursor-pointer">
                <FileSignature className="h-4 w-4 text-green-500" />
                Signature Required
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Switch
                id="is_fragile"
                checked={isFragile}
                onCheckedChange={setIsFragile}
              />
              <Label htmlFor="is_fragile" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Fragile
              </Label>
            </div>
          </div>
        </div>

        {/* Get Quotes Button */}
        <Button 
          onClick={handleGetQuotes} 
          disabled={loadingQuotes || !isFormValid}
          className="w-full"
          size="lg"
        >
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

        {/* Selected Quote Summary */}
        {selectedQuoteId && selectedQuoteCost && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Selected Delivery Cost:</span>
              <span className="text-lg font-bold text-primary">
                {new Intl.NumberFormat('en-ZA', {
                  style: 'currency',
                  currency: 'ZAR',
                }).format(selectedQuoteCost)}
              </span>
            </div>
          </div>
        )}

        {/* Special Instructions */}
        <div>
          <Label htmlFor="special_instructions">Special Instructions</Label>
          <Textarea
            id="special_instructions"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special delivery instructions for the courier..."
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
