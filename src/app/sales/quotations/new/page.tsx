'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdvancedCustomerSearch } from '@/components/sales/AdvancedCustomerSearch';
import { AdvancedProductSearch } from '@/components/sales/AdvancedProductSearch';
import { DocumentTotals } from '@/components/sales/DocumentTotals';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface QuotationItem {
  product_id?: string;
  sku?: string;
  name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; company?: string | null } | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    currency: 'ZAR',
    valid_until: '',
    reference_number: '',
    notes: '',
    items: [] as QuotationItem[],
  });

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

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (formData.items.some(item => !item.name || item.name.trim() === '')) {
      toast.error('All items must have a product name');
      return;
    }

    if (formData.items.some(item => item.quantity <= 0)) {
      toast.error('All items must have a quantity greater than 0');
      return;
    }

    if (formData.items.some(item => item.unit_price < 0)) {
      toast.error('All items must have a valid unit price');
      return;
    }

    setLoading(true);
    try {
      // Prepare items with required fields
      const items = formData.items.map((item, index) => {
        // Only include product_id if it's a valid UUID, otherwise set to null
        let productId = null;
        if (item.product_id) {
          // Check if it's a valid UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(item.product_id)) {
            productId = item.product_id;
          }
        }

        return {
          product_id: productId,
          sku: item.sku || null,
          name: item.name,
          description: null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          subtotal: item.subtotal,
          total: item.total,
          line_number: index + 1,
        };
      });

      const payload = {
        customer_id: formData.customer_id,
        currency: formData.currency || 'ZAR',
        valid_until: formData.valid_until || null,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        items,
      };

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

  const totalSubtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalTax = formData.items.reduce((sum, item) => sum + item.tax_amount, 0);
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
                          <div key={index} className="space-y-3 rounded-lg border p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{item.name}</span>
                                  {item.sku && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.sku}
                                    </Badge>
                                  )}
                                </div>
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                  <div>
                    <Label>Reference Number</Label>
                    <Input
                      value={formData.reference_number}
                      onChange={e => setFormData({ ...formData, reference_number: e.target.value })}
                    />
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
                <CardContent>
                  <DocumentTotals
                    subtotal={totalSubtotal}
                    totalTax={totalTax}
                    total={total}
                    currency={formData.currency}
                  />
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

