// UPDATE: [2025-12-25] Added auto-generated reference number with override toggle, delivery as line item

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, X, Lock, Unlock, RefreshCw, Truck } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdvancedCustomerSearch } from '@/components/sales/AdvancedCustomerSearch';
import { AdvancedProductSearch } from '@/components/sales/AdvancedProductSearch';
import { DocumentTotals } from '@/components/sales/DocumentTotals';
import { DeliverySelector } from '@/components/logistics/DeliverySelector';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DeliveryOptionsInput } from '@/types/logistics';

interface QuotationItem {
  product_id?: string;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  is_delivery?: boolean;
  delivery_quote_id?: string;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; company?: string | null } | null>(null);
  
  // Reference number state
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isReferenceOverride, setIsReferenceOverride] = useState(false);
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    currency: 'ZAR',
    valid_until: '',
    notes: '',
    items: [] as QuotationItem[],
  });
  
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOptionsInput | null>(null);

  // Generate reference number on mount
  useEffect(() => {
    generateReferenceNumber();
  }, []);

  const generateReferenceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRef = `REF-${year}-${random}`;
    setReferenceNumber(newRef);
  };

  const handleRegenerateRef = () => {
    if (isReferenceOverride) {
      // If in override mode, ask before regenerating
      if (!confirm('This will replace your custom reference number. Continue?')) {
        return;
      }
      setIsReferenceOverride(false);
    }
    setIsGeneratingRef(true);
    generateReferenceNumber();
    setTimeout(() => setIsGeneratingRef(false), 300);
  };

  const toggleReferenceOverride = () => {
    if (!isReferenceOverride) {
      // Entering override mode
      setIsReferenceOverride(true);
    } else {
      // Exiting override mode, regenerate
      generateReferenceNumber();
      setIsReferenceOverride(false);
    }
  };

  const calculateItemTotals = (item: QuotationItem) => {
    const subtotal = item.quantity * item.unit_price;
    const taxAmount = subtotal * item.tax_rate;
    const total = subtotal + taxAmount;
    return { subtotal, tax_amount: taxAmount, total };
  };

  const updateItem = (index: number, updates: Partial<QuotationItem>) => {
    const newItems = [...formData.items];
    const updatedItem = { ...newItems[index], ...updates };
    const totals = calculateItemTotals(updatedItem);
    newItems[index] = { ...updatedItem, ...totals };
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (product: {
    id: string;
    sku: string;
    name: string;
    sale_price?: number | null;
    cost_price?: number | null;
  }) => {
    const newItem: QuotationItem = {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      quantity: 1,
      unit_price: product.sale_price || product.cost_price || 0,
      tax_rate: 0.15, // Default 15% VAT for South Africa
      tax_amount: 0,
      subtotal: 0,
      total: 0,
    };
    const totals = calculateItemTotals(newItem);
    setFormData({
      ...formData,
      items: [...formData.items, { ...newItem, ...totals }],
    });
    toast.success(`Added ${product.name} to quotation`);
  };

  const removeItem = (index: number) => {
    const item = formData.items[index];
    // If removing a delivery item, clear delivery options
    if (item.is_delivery) {
      setDeliveryOptions(null);
    }
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleCustomerSelect = (customerId: string, customer?: { id: string; name: string; company?: string | null }) => {
    setFormData({ ...formData, customer_id: customerId });
    if (customer) {
      setSelectedCustomer(customer);
    }
  };

  // Handle delivery selection - add as line item
  const handleDeliverySelected = (options: DeliveryOptionsInput | null) => {
    setDeliveryOptions(options);
    
    // Remove any existing delivery items
    const itemsWithoutDelivery = formData.items.filter(item => !item.is_delivery);
    
    if (options && options.selected_quote_id && options.selected_quote_cost) {
      // Add delivery as a line item
      const deliveryItem: QuotationItem = {
        name: 'Courier Delivery',
        description: `${options.service_tier?.charAt(0).toUpperCase()}${options.service_tier?.slice(1) || 'Standard'} delivery service`,
        quantity: 1,
        unit_price: options.selected_quote_cost,
        tax_rate: 0.15, // VAT on delivery
        tax_amount: options.selected_quote_cost * 0.15,
        subtotal: options.selected_quote_cost,
        total: options.selected_quote_cost * 1.15,
        is_delivery: true,
        delivery_quote_id: options.selected_quote_id,
      };
      
      setFormData({
        ...formData,
        items: [...itemsWithoutDelivery, deliveryItem],
      });
      
      toast.success('Delivery added to quotation');
    } else {
      // No delivery selected
      setFormData({
        ...formData,
        items: itemsWithoutDelivery,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    // Validate customer_id is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formData.customer_id)) {
      toast.error('Invalid customer selected. Please select a customer again.');
      return;
    }

    // Check for non-delivery items
    const productItems = formData.items.filter(item => !item.is_delivery);
    if (productItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    if (productItems.some(item => !item.name || item.name.trim() === '')) {
      toast.error('All items must have a product name');
      return;
    }

    if (productItems.some(item => item.quantity <= 0)) {
      toast.error('All items must have a quantity greater than 0');
      return;
    }

    if (productItems.some(item => item.unit_price < 0)) {
      toast.error('All items must have a valid unit price');
      return;
    }

    setLoading(true);
    try {
      // Prepare items with required fields
      const items = formData.items.map((item, index) => {
        // Only include product_id if it's a valid UUID and not a delivery item
        let productId = null;
        if (item.product_id && !item.is_delivery) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(item.product_id)) {
            productId = item.product_id;
          }
        }

        // Ensure all numeric values are proper numbers
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unit_price);
        const taxRate = Number(item.tax_rate);
        const taxAmount = Number(item.tax_amount);
        const subtotal = Number(item.subtotal);
        const total = Number(item.total);

        // Validate numbers
        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Item ${index + 1}: Invalid quantity`);
        }
        if (isNaN(unitPrice) || unitPrice < 0) {
          throw new Error(`Item ${index + 1}: Invalid unit price`);
        }
        if (isNaN(taxRate) || taxRate < 0 || taxRate > 1) {
          throw new Error(`Item ${index + 1}: Invalid tax rate (must be between 0 and 1)`);
        }

        return {
          product_id: productId,
          sku: item.sku || null,
          name: item.name.trim(),
          description: item.description || null,
          quantity,
          unit_price: unitPrice,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          subtotal,
          total,
          line_number: index + 1,
          is_delivery: item.is_delivery || false,
          delivery_quote_id: item.delivery_quote_id || null,
        };
      });

      const payload: Record<string, unknown> = {
        customer_id: formData.customer_id,
        currency: formData.currency || 'ZAR',
        valid_until: formData.valid_until || null,
        reference_number: referenceNumber || null,
        notes: formData.notes || null,
        items,
      };

      // Add delivery options if provided
      if (deliveryOptions) {
        payload.delivery_options = {
          delivery_address: deliveryOptions.delivery_address,
          delivery_contact_name: deliveryOptions.delivery_address?.contact_name,
          delivery_contact_phone: deliveryOptions.delivery_address?.contact_phone,
          delivery_contact_email: deliveryOptions.delivery_address?.contact_email,
          service_tier_id: deliveryOptions.service_tier,
          selected_cost_quote_id: deliveryOptions.selected_quote_id,
          special_instructions: deliveryOptions.special_instructions,
          weight_kg: deliveryOptions.weight_kg,
          dimensions: deliveryOptions.dimensions,
          declared_value: deliveryOptions.declared_value,
          is_insured: deliveryOptions.is_insured,
          requires_signature: deliveryOptions.requires_signature,
          is_fragile: deliveryOptions.is_fragile,
          package_description: deliveryOptions.package_description,
          delivery_cost: deliveryOptions.selected_quote_cost,
        };
      }

      const response = await fetch('/api/v1/sales/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details
            .map((err: { path: string[]; message: string }) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          toast.error(`Validation error: ${errorMessages}`, { duration: 5000 });
        } else {
          toast.error(result.error || `Failed to create quotation (${response.status})`, { duration: 5000 });
        }
        console.error('Quotation creation failed:', { status: response.status, result });
        return;
      }

      if (result.success && result.data?.id) {
        toast.success('Quotation created successfully');
        router.push(`/sales/quotations/${result.data.id}`);
      } else {
        toast.error(result.error || 'Failed to create quotation - no ID returned');
        console.error('Unexpected response format:', result);
      }
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast.error(error instanceof Error ? error.message : 'Error creating quotation');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals including delivery
  const productItems = formData.items.filter(item => !item.is_delivery);
  const deliveryItem = formData.items.find(item => item.is_delivery);
  
  const productSubtotal = productItems.reduce((sum, item) => sum + item.subtotal, 0);
  const productTax = productItems.reduce((sum, item) => sum + item.tax_amount, 0);
  const deliverySubtotal = deliveryItem?.subtotal || 0;
  const deliveryTax = deliveryItem?.tax_amount || 0;
  
  const totalSubtotal = productSubtotal + deliverySubtotal;
  const totalTax = productTax + deliveryTax;
  const total = totalSubtotal + totalTax;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sales/quotations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">New Quotation</h1>
            <p className="text-muted-foreground">Create a new quotation</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Customer *</Label>
                      <AdvancedCustomerSearch
                        value={formData.customer_id}
                        onValueChange={handleCustomerSelect}
                        placeholder="Search customers by name, email, company, phone..."
                      />
                      {selectedCustomer && (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline">
                            {selectedCustomer.company || selectedCustomer.name}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, customer_id: '' });
                              setSelectedCustomer(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Add Product</Label>
                      <AdvancedProductSearch
                        onProductSelect={handleProductSelect}
                        excludeProductIds={formData.items.map(item => item.product_id || '').filter(Boolean)}
                        placeholder="Search products by name, SKU, category, brand..."
                      />
                    </div>
                    {formData.items.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                        <p>No items added yet. Use the search above to add products.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.items.map((item, index) => (
                          <div 
                            key={index} 
                            className={`space-y-3 rounded-lg border p-4 ${
                              item.is_delivery 
                                ? 'bg-primary/5 border-primary/20' 
                                : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {item.is_delivery && (
                                    <Truck className="h-4 w-4 text-primary" />
                                  )}
                                  <span className="font-medium">{item.name}</span>
                                  {item.sku && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.sku}
                                    </Badge>
                                  )}
                                  {item.is_delivery && (
                                    <Badge variant="secondary" className="text-xs">
                                      Delivery
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {!item.is_delivery && (
                              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div>
                                  <Label>Quantity *</Label>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={e => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                                    min="0.01"
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <Label>Unit Price (ZAR) *</Label>
                                  <Input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={e => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <Label>Tax Rate (VAT)</Label>
                                  <Input
                                    type="number"
                                    value={item.tax_rate}
                                    onChange={e => updateItem(index, { tax_rate: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    placeholder="0.15"
                                  />
                                </div>
                                <div>
                                  <Label>Total (ZAR)</Label>
                                  <Input
                                    value={new Intl.NumberFormat('en-ZA', {
                                      style: 'currency',
                                      currency: 'ZAR',
                                      minimumFractionDigits: 2,
                                    }).format(item.total)}
                                    disabled
                                    className="font-medium"
                                  />
                                </div>
                              </div>
                            )}
                            {item.is_delivery && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Delivery cost including VAT</span>
                                <span className="font-medium">
                                  {new Intl.NumberFormat('en-ZA', {
                                    style: 'currency',
                                    currency: 'ZAR',
                                  }).format(item.total)}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Options */}
              <DeliverySelector
                onDeliverySelected={handleDeliverySelected}
                initialData={deliveryOptions || undefined}
              />
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Currency</Label>
                    <Input
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                      placeholder="ZAR"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Default: ZAR (South African Rand)
                    </p>
                  </div>
                  <div>
                    <Label>Valid Until</Label>
                    <Input
                      type="date"
                      value={formData.valid_until}
                      onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                  
                  {/* Reference Number with Override */}
                  <div>
                    <Label className="flex items-center gap-2">
                      Reference Number
                      {!isReferenceOverride && (
                        <Badge variant="secondary" className="text-xs">Auto</Badge>
                      )}
                      {isReferenceOverride && (
                        <Badge variant="outline" className="text-xs">Custom</Badge>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={referenceNumber}
                        onChange={e => setReferenceNumber(e.target.value)}
                        disabled={!isReferenceOverride}
                        placeholder="REF-2025-XXXXXX"
                        className={!isReferenceOverride ? 'bg-muted' : ''}
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={toggleReferenceOverride}
                            >
                              {isReferenceOverride ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isReferenceOverride 
                              ? 'Lock to auto-generate' 
                              : 'Unlock to enter custom reference'
                            }
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={handleRegenerateRef}
                              disabled={isGeneratingRef}
                            >
                              <RefreshCw className={`h-4 w-4 ${isGeneratingRef ? 'animate-spin' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Regenerate reference number
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isReferenceOverride 
                        ? 'Enter your custom reference number'
                        : 'Auto-generated reference number'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Totals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DocumentTotals
                    subtotal={productSubtotal}
                    totalTax={productTax}
                    total={productSubtotal + productTax}
                    currency={formData.currency}
                    label="Products"
                  />
                  
                  {deliveryItem && (
                    <>
                      <div className="border-t pt-4">
                        <DocumentTotals
                          subtotal={deliverySubtotal}
                          totalTax={deliveryTax}
                          total={deliverySubtotal + deliveryTax}
                          currency={formData.currency}
                          label="Delivery"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Grand Total</span>
                      <span>
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: formData.currency || 'ZAR',
                        }).format(total)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Creating...' : 'Create Quotation'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
