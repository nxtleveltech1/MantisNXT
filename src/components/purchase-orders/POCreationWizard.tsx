'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus,
  Calendar as CalendarIcon,
  Search,
  Building2,
  CheckCircle,
  AlertTriangle,
  X,
  Package,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { MultiSupplierProductPicker } from './MultiSupplierProductPicker';
import type { MultiSupplierCart, SelectedSupplierOffer } from '@/types/supplier-comparison';

interface POCreationWizardProps {
  open: boolean;
  onClose: () => void;
}

interface LineItem {
  id: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  deliveryDate?: Date;
  specifications?: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  paymentTerms: string;
  currency: string;
}

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'TechCorp Solutions',
    code: 'TECH001',
    paymentTerms: 'Net 30',
    currency: 'USD',
  },
  {
    id: '2',
    name: 'Global Manufacturing Inc.',
    code: 'GLOB002',
    paymentTerms: 'Net 45',
    currency: 'EUR',
  },
];

// Flow mode type
type FlowMode = 'select' | 'supplier-first' | 'product-first';

const POCreationWizard: React.FC<POCreationWizardProps> = ({ open, onClose }) => {
  // Flow selection state
  const [flowMode, setFlowMode] = useState<FlowMode>('select');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [importedCart, setImportedCart] = useState<MultiSupplierCart | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    supplierId: '',
    department: '',
    priority: 'medium',
    requestedDeliveryDate: new Date(),
    budgetCode: '',
    notes: '',
    paymentTerms: '',
    deliveryTerms: 'FOB Destination',
    warrantyTerms: '1 Year Standard',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      productCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      category: '',
    },
  ]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [budgetValidation, setBudgetValidation] = useState<{
    status: 'valid' | 'warning' | 'error';
    message: string;
    available: number;
    requested: number;
  } | null>(null);

  // Handle product picker completion
  const handleProductPickerComplete = (cart: MultiSupplierCart) => {
    setImportedCart(cart);
    setShowProductPicker(false);

    // Convert cart items to line items
    if (cart.groups.length === 1) {
      // Single supplier - set supplier and convert items
      const group = cart.groups[0];
      handleInputChange('supplierId', group.supplier_id);

      const newLineItems: LineItem[] = group.items.map((item, index) => ({
        id: `imported-${index}`,
        productCode: item.supplier_sku,
        description: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        category: '',
      }));

      setLineItems(newLineItems);
      setCurrentStep(2); // Go to line items step
    } else if (cart.groups.length > 1) {
      // Multiple suppliers - show summary and offer to create multiple POs
      // For now, just use the first supplier's items
      const group = cart.groups[0];
      handleInputChange('supplierId', group.supplier_id);

      const newLineItems: LineItem[] = group.items.map((item, index) => ({
        id: `imported-${index}`,
        productCode: item.supplier_sku,
        description: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        category: '',
      }));

      setLineItems(newLineItems);
      setCurrentStep(2);
    }
  };

  // Reset flow mode when dialog closes
  const handleClose = () => {
    setFlowMode('select');
    setShowProductPicker(false);
    setImportedCart(null);
    setCurrentStep(1);
    onClose();
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = totalAmount * 0.1; // 10% tax
  const finalTotal = totalAmount + taxAmount;

  const selectedSupplier = mockSuppliers.find(s => s.id === formData.supplierId);

  const steps = [
    { number: 1, title: 'Supplier & Basic Info', description: 'Select supplier and basic details' },
    { number: 2, title: 'Line Items', description: 'Add products and services' },
    { number: 3, title: 'Terms & Delivery', description: 'Set terms and delivery details' },
    { number: 4, title: 'Review & Submit', description: 'Review and validate order' },
  ];

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      productCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      category: '',
    };
    setLineItems(prev => [...prev, newItem]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: unknown) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Recalculate total price when quantity or unit price changes
          if (field === 'quantity' || field === 'unitPrice') {
            updated.totalPrice = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const validateStep = (step: number): boolean => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (!formData.supplierId) errors.push('Supplier is required');
        if (!formData.department) errors.push('Department is required');
        break;
      case 2:
        if (lineItems.length === 0) errors.push('At least one line item is required');
        lineItems.forEach((item, index) => {
          if (!item.description) errors.push(`Line item ${index + 1}: Description is required`);
          if (item.quantity <= 0)
            errors.push(`Line item ${index + 1}: Quantity must be greater than 0`);
          if (item.unitPrice <= 0)
            errors.push(`Line item ${index + 1}: Unit price must be greater than 0`);
        });
        break;
      case 3:
        if (!formData.paymentTerms) errors.push('Payment terms are required');
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2) {
        // Validate budget when moving from line items step
        validateBudget();
      }
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const previousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateBudget = () => {
    // Mock budget validation
    const availableBudget = 50000;
    const requestedAmount = finalTotal;

    if (requestedAmount > availableBudget) {
      setBudgetValidation({
        status: 'error',
        message: 'Requested amount exceeds available budget',
        available: availableBudget,
        requested: requestedAmount,
      });
    } else if (requestedAmount > availableBudget * 0.8) {
      setBudgetValidation({
        status: 'warning',
        message: 'Requested amount is close to budget limit',
        available: availableBudget,
        requested: requestedAmount,
      });
    } else {
      setBudgetValidation({
        status: 'valid',
        message: 'Budget validation passed',
        available: availableBudget,
        requested: requestedAmount,
      });
    }
  };

  const handleSubmit = () => {
    if (validateStep(4)) {
      // Mock submission
      handleClose();
    }
  };

  const filteredSuppliers = mockSuppliers.filter(
    supplier =>
      supplier.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      supplier.code.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // Start product-first flow
  const startProductFirstFlow = () => {
    setFlowMode('product-first');
    setShowProductPicker(true);
  };

  // Start supplier-first flow
  const startSupplierFirstFlow = () => {
    setFlowMode('supplier-first');
    setCurrentStep(1);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              {flowMode === 'select'
                ? 'Choose how you want to create your purchase order'
                : 'Follow the steps below to create a new purchase order'}
            </DialogDescription>
          </DialogHeader>

          {/* Flow Selection Screen */}
          {flowMode === 'select' && (
            <div className="py-8">
              <h3 className="mb-6 text-center text-lg font-semibold">
                How would you like to start?
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Supplier First Option */}
                <Card
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                  onClick={startSupplierFirstFlow}
                >
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="mb-4 rounded-full bg-primary/10 p-4">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="mb-2 font-semibold">Start with Supplier</h4>
                    <p className="text-sm text-muted-foreground">
                      Select a supplier first, then add products from their catalog
                    </p>
                    <Button className="mt-4" variant="outline">
                      Select Supplier
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Product First Option */}
                <Card
                  className="cursor-pointer border-primary/50 bg-primary/5 transition-all hover:border-primary hover:shadow-md"
                  onClick={startProductFirstFlow}
                >
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="mb-4 rounded-full bg-primary/10 p-4">
                      <Package className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="mb-2 font-semibold">Start with Products</h4>
                    <p className="text-sm text-muted-foreground">
                      Search products and compare prices across all suppliers
                    </p>
                    <Badge variant="secondary" className="mb-2 mt-1">
                      <BarChart3 className="mr-1 h-3 w-3" />
                      Compare Prices
                    </Badge>
                    <Button className="mt-2">
                      Find Products
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Imported cart summary */}
              {importedCart && importedCart.items.length > 0 && (
                <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Products Selected</h4>
                      <p className="text-sm text-muted-foreground">
                        {importedCart.total_items} items from {importedCart.supplier_count} supplier(s)
                      </p>
                    </div>
                    <Button onClick={startSupplierFirstFlow}>
                      Continue with Selection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standard Wizard Flow (supplier-first or after product selection) */}
          {flowMode !== 'select' && (
            <>
              {/* Progress Steps */}
              <div className="mb-6 flex items-center justify-between">
                {steps.map(step => (
                  <div key={step.number} className="flex items-center">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                        step.number <= currentStep
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {step.number < currentStep ? <CheckCircle className="h-4 w-4" /> : step.number}
                    </div>
                    {step.number < steps.length && (
                      <div
                        className={cn(
                          'mx-2 h-0.5 w-16',
                          step.number < currentStep ? 'bg-primary' : 'bg-muted'
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="min-h-[400px]">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-semibold">Supplier & Basic Information</h3>

                {/* Supplier Selection */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="supplier-search">Search Suppliers</Label>
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                      <Input
                        id="supplier-search"
                        placeholder="Search by name or code..."
                        value={supplierSearch}
                        onChange={e => setSupplierSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredSuppliers.map(supplier => (
                      <Card
                        key={supplier.id}
                        className={cn(
                          'cursor-pointer transition-colors',
                          formData.supplierId === supplier.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        )}
                        onClick={() => handleInputChange('supplierId', supplier.id)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{supplier.name}</h4>
                              <p className="text-muted-foreground text-sm">{supplier.code}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="secondary">{supplier.paymentTerms}</Badge>
                                <Badge variant="outline">{supplier.currency}</Badge>
                              </div>
                            </div>
                            <Building2 className="text-muted-foreground h-5 w-5" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={formData.department}
                      onValueChange={value => handleInputChange('department', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={value => handleInputChange('priority', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="budget-code">Budget Code</Label>
                    <Input
                      id="budget-code"
                      placeholder="e.g., BUDGET-2024-001"
                      value={formData.budgetCode}
                      onChange={e => handleInputChange('budgetCode', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Requested Delivery Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.requestedDeliveryDate, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.requestedDeliveryDate}
                          onSelect={date => handleInputChange('requestedDeliveryDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or special instructions..."
                    value={formData.notes}
                    onChange={e => handleInputChange('notes', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <Button onClick={addLineItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <Card key={item.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                        {lineItems.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeLineItem(item.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label>Product Code</Label>
                          <Input
                            placeholder="e.g., LAPTOP-001"
                            value={item.productCode}
                            onChange={e => updateLineItem(item.id, 'productCode', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select
                            value={item.category}
                            onValueChange={value => updateLineItem(item.id, 'category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hardware">Hardware</SelectItem>
                              <SelectItem value="software">Software</SelectItem>
                              <SelectItem value="services">Services</SelectItem>
                              <SelectItem value="supplies">Supplies</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Detailed description of the item..."
                          value={item.description}
                          onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e =>
                              updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e =>
                              updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label>Total Price</Label>
                          <Input
                            value={formatCurrency(item.totalPrice)}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Specifications (Optional)</Label>
                        <Textarea
                          placeholder="Technical specifications or requirements..."
                          value={item.specifications || ''}
                          onChange={e => updateLineItem(item.id, 'specifications', e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (10%):</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(finalTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Terms & Delivery</h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Payment Terms</h4>
                  <div>
                    <Label>Payment Terms</Label>
                    <Select
                      value={formData.paymentTerms}
                      onValueChange={value => handleInputChange('paymentTerms', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="net-15">Net 15</SelectItem>
                        <SelectItem value="net-30">Net 30</SelectItem>
                        <SelectItem value="net-45">Net 45</SelectItem>
                        <SelectItem value="net-60">Net 60</SelectItem>
                        <SelectItem value="due-on-receipt">Due on Receipt</SelectItem>
                        <SelectItem value="2-10-net-30">2/10 Net 30</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Delivery Terms</h4>
                  <div>
                    <Label>Delivery Terms</Label>
                    <Select
                      value={formData.deliveryTerms}
                      onValueChange={value => handleInputChange('deliveryTerms', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fob-destination">FOB Destination</SelectItem>
                        <SelectItem value="fob-origin">FOB Origin</SelectItem>
                        <SelectItem value="ddu">DDU (Delivered Duty Unpaid)</SelectItem>
                        <SelectItem value="ddp">DDP (Delivered Duty Paid)</SelectItem>
                        <SelectItem value="ex-works">Ex Works</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label>Warranty Terms</Label>
                <Select
                  value={formData.warrantyTerms}
                  onValueChange={value => handleInputChange('warrantyTerms', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30-days">30 Days</SelectItem>
                    <SelectItem value="90-days">90 Days</SelectItem>
                    <SelectItem value="6-months">6 Months</SelectItem>
                    <SelectItem value="1-year-standard">1 Year Standard</SelectItem>
                    <SelectItem value="2-year-extended">2 Year Extended</SelectItem>
                    <SelectItem value="3-year-premium">3 Year Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Review & Submit</h3>

              {/* Budget Validation */}
              {budgetValidation && (
                <Card
                  className={cn(
                    'border-l-4',
                    budgetValidation.status === 'valid' && 'border-l-green-500',
                    budgetValidation.status === 'warning' && 'border-l-yellow-500',
                    budgetValidation.status === 'error' && 'border-l-red-500'
                  )}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      {budgetValidation.status === 'valid' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {budgetValidation.status === 'warning' && (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      {budgetValidation.status === 'error' && (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{budgetValidation.message}</p>
                        <p className="text-muted-foreground text-sm">
                          Available: {formatCurrency(budgetValidation.available)} | Requested:{' '}
                          {formatCurrency(budgetValidation.requested)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Summary */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Supplier Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedSupplier && (
                      <div className="space-y-2">
                        <p>
                          <strong>Name:</strong> {selectedSupplier.name}
                        </p>
                        <p>
                          <strong>Code:</strong> {selectedSupplier.code}
                        </p>
                        <p>
                          <strong>Payment Terms:</strong> {selectedSupplier.paymentTerms}
                        </p>
                        <p>
                          <strong>Currency:</strong> {selectedSupplier.currency}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p>
                        <strong>Department:</strong> {formData.department}
                      </p>
                      <p>
                        <strong>Priority:</strong> {formData.priority}
                      </p>
                      <p>
                        <strong>Delivery Date:</strong>{' '}
                        {format(formData.requestedDeliveryDate, 'PPP')}
                      </p>
                      <p>
                        <strong>Items:</strong> {lineItems.length}
                      </p>
                      <p>
                        <strong>Total:</strong> {formatCurrency(finalTotal)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Line Items Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Line Items ({lineItems.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lineItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b py-2 last:border-b-0"
                      >
                        <div>
                          <p className="font-medium">{item.description || 'Unnamed Item'}</p>
                          <p className="text-muted-foreground text-sm">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Please fix the following errors:</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-red-600">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

              {/* Navigation */}
              <div className="flex justify-between border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentStep === 1) {
                      setFlowMode('select');
                    } else {
                      previousStep();
                    }
                  }}
                >
                  {currentStep === 1 ? 'Back to Start' : 'Previous'}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  {currentStep < 4 ? (
                    <Button onClick={nextStep}>Next</Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={budgetValidation?.status === 'error'}>
                      Create Purchase Order
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Multi-Supplier Product Picker */}
      <MultiSupplierProductPicker
        open={showProductPicker}
        onOpenChange={setShowProductPicker}
        onComplete={handleProductPickerComplete}
      />
    </>
  );
};

export default POCreationWizard;
