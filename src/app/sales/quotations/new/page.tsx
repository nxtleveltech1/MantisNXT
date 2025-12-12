'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerSelector } from '@/components/sales/CustomerSelector';
import { DocumentTotals } from '@/components/sales/DocumentTotals';
import { toast } from 'sonner';

export default function NewQuotationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    currency: 'USD',
    valid_until: '',
    reference_number: '',
    notes: '',
    items: [
      {
        name: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        tax_amount: 0,
        subtotal: 0,
        total: 0,
      },
    ],
  });

  const calculateItemTotals = (item: typeof formData.items[0]) => {
    const subtotal = item.quantity * item.unit_price;
    const taxAmount = subtotal * item.tax_rate;
    const total = subtotal + taxAmount;
    return { subtotal, tax_amount: taxAmount, total };
  };

  const updateItem = (index: number, updates: Partial<typeof formData.items[0]>) => {
    const newItems = [...formData.items];
    const updatedItem = { ...newItems[index], ...updates };
    const totals = calculateItemTotals(updatedItem);
    newItems[index] = { ...updatedItem, ...totals };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          name: '',
          quantity: 1,
          unit_price: 0,
          tax_rate: 0,
          tax_amount: 0,
          subtotal: 0,
          total: 0,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    if (formData.items.length === 0 || formData.items.some(item => !item.name || item.quantity <= 0)) {
      toast.error('Please add at least one valid item');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/sales/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          valid_until: formData.valid_until || null,
          reference_number: formData.reference_number || null,
          notes: formData.notes || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Quotation created successfully');
        router.push(`/sales/quotations/${result.data.id}`);
      } else {
        toast.error(result.error || 'Failed to create quotation');
      }
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast.error('Error creating quotation');
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
                      <CustomerSelector
                        value={formData.customer_id}
                        onValueChange={customerId => setFormData({ ...formData, customer_id: customerId })}
                      />
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
                    {formData.items.map((item, index) => (
                      <div key={index} className="space-y-2 rounded-lg border p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Product Name *</Label>
                            <Input
                              value={item.name}
                              onChange={e => updateItem(index, { name: e.target.value })}
                              placeholder="Product name"
                            />
                          </div>
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
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Unit Price *</Label>
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={e => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label>Tax Rate</Label>
                            <Input
                              type="number"
                              value={item.tax_rate}
                              onChange={e => updateItem(index, { tax_rate: parseFloat(e.target.value) || 0 })}
                              min="0"
                              max="1"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label>Total</Label>
                            <Input
                              value={new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: formData.currency,
                              }).format(item.total)}
                              disabled
                            />
                          </div>
                        </div>
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            Remove Item
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addItem}>
                      Add Item
                    </Button>
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
                    />
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

