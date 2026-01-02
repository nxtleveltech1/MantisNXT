'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { SKUComparisonPanel } from '@/components/products/SKUComparisonPanel';
import type {
  SupplierOffer,
  SelectedSupplierOffer,
  SupplierPurchaseGroup,
  MultiSupplierCart,
} from '@/types/supplier-comparison';
import { cn } from '@/lib/utils';

interface MultiSupplierProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (cart: MultiSupplierCart) => void;
}

/**
 * Component for selecting products from multiple suppliers
 * to create purchase orders in a product-first workflow.
 */
export function MultiSupplierProductPicker({
  open,
  onOpenChange,
  onComplete,
}: MultiSupplierProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showComparisonPanel, setShowComparisonPanel] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedSupplierOffer[]>([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');

  // Calculate cart summary
  const cart = useMemo<MultiSupplierCart>(() => {
    const groups = new Map<string, SupplierPurchaseGroup>();

    for (const item of selectedItems) {
      if (!groups.has(item.supplier_id)) {
        groups.set(item.supplier_id, {
          supplier_id: item.supplier_id,
          supplier_name: item.supplier_name,
          items: [],
          subtotal: 0,
          currency: item.currency,
        });
      }

      const group = groups.get(item.supplier_id)!;
      group.items.push(item);
      group.subtotal += item.total_price;
    }

    const groupsArray = Array.from(groups.values());
    const totalValue = groupsArray.reduce((sum, g) => sum + g.subtotal, 0);

    return {
      items: selectedItems,
      groups: groupsArray,
      total_items: selectedItems.length,
      total_value: totalValue,
      supplier_count: groupsArray.length,
    };
  }, [selectedItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSearch = useCallback(() => {
    if (searchQuery.trim().length >= 2) {
      setCurrentSearchQuery(searchQuery.trim());
      setShowComparisonPanel(true);
    }
  }, [searchQuery]);

  const handleSelectOffer = useCallback((offer: SupplierOffer) => {
    const effectivePrice = offer.cost_after_discount ?? offer.current_price ?? 0;

    const newItem: SelectedSupplierOffer = {
      supplier_product_id: offer.supplier_product_id,
      supplier_id: offer.supplier_id,
      supplier_name: offer.supplier_name,
      supplier_sku: offer.supplier_sku,
      product_name: offer.name_from_supplier,
      quantity: 1,
      unit_price: effectivePrice,
      currency: offer.currency || 'ZAR',
      discount: offer.base_discount,
      total_price: effectivePrice,
    };

    setSelectedItems(prev => {
      // Check if already selected
      const existingIndex = prev.findIndex(
        item => item.supplier_product_id === offer.supplier_product_id
      );

      if (existingIndex >= 0) {
        // Remove if already selected
        return prev.filter((_, i) => i !== existingIndex);
      }

      return [...prev, newItem];
    });
  }, []);

  const updateQuantity = useCallback((supplierId: string, supplierProductId: string, delta: number) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (
          item.supplier_id === supplierId &&
          item.supplier_product_id === supplierProductId
        ) {
          const newQty = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQty,
            total_price: item.unit_price * newQty,
          };
        }
        return item;
      })
    );
  }, []);

  const removeItem = useCallback((supplierProductId: string) => {
    setSelectedItems(prev =>
      prev.filter(item => item.supplier_product_id !== supplierProductId)
    );
  }, []);

  const clearCart = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const handleComplete = useCallback(() => {
    if (cart.items.length === 0) return;
    onComplete?.(cart);
    onOpenChange(false);
  }, [cart, onComplete, onOpenChange]);

  const selectedIds = useMemo(
    () => new Set(selectedItems.map(item => item.supplier_product_id)),
    [selectedItems]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Select Products for Purchase
            </DialogTitle>
            <DialogDescription>
              Search for products and compare prices across suppliers before adding to your order
            </DialogDescription>
          </DialogHeader>

          <div className="flex h-[70vh]">
            {/* Left Side: Search and Product Selection */}
            <div className="flex flex-1 flex-col border-r">
              {/* Search Bar */}
              <div className="border-b p-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by SKU or product name..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={searchQuery.trim().length < 2}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Compare Prices
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Enter a SKU or product name to see prices from all suppliers
                </p>
              </div>

              {/* Selected Items List */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {selectedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 rounded-full bg-muted p-4">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="mb-2 font-semibold">No Products Selected</h3>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Search for products above and select suppliers to add them to your order
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          Selected Products ({selectedItems.length})
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearCart}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Clear All
                        </Button>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map(item => (
                            <TableRow key={item.supplier_product_id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.product_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.supplier_sku}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  {item.supplier_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div>
                                  {formatCurrency(item.unit_price)}
                                  {item.discount && item.discount > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="ml-2 text-xs text-emerald-600"
                                    >
                                      -{item.discount}%
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      updateQuantity(item.supplier_id, item.supplier_product_id, -1)
                                    }
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      updateQuantity(item.supplier_id, item.supplier_product_id, 1)
                                    }
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.total_price)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeItem(item.supplier_product_id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Side: Cart Summary */}
            <div className="w-80 bg-muted/30">
              <div className="p-4">
                <h4 className="mb-4 flex items-center gap-2 font-semibold">
                  <ShoppingCart className="h-4 w-4" />
                  Order Summary
                </h4>

                {cart.supplier_count === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No items selected yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Warning for multiple suppliers */}
                    {cart.supplier_count > 1 && (
                      <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        <div>
                          <p className="font-medium text-amber-700">Multiple Suppliers</p>
                          <p className="text-amber-600">
                            This will create {cart.supplier_count} separate purchase orders
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Supplier Groups */}
                    <div className="space-y-3">
                      {cart.groups.map(group => (
                        <Card key={group.supplier_id}>
                          <CardHeader className="p-3 pb-2">
                            <CardTitle className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {group.supplier_name}
                              </div>
                              <Badge variant="secondary">{group.items.length} items</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {group.items.slice(0, 3).map(item => (
                                <div key={item.supplier_product_id} className="truncate">
                                  {item.quantity}× {item.product_name}
                                </div>
                              ))}
                              {group.items.length > 3 && (
                                <div className="text-muted-foreground">
                                  +{group.items.length - 3} more...
                                </div>
                              )}
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between font-medium">
                              <span>Subtotal</span>
                              <span>{formatCurrency(group.subtotal)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Total */}
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Items</span>
                        <span>{cart.total_items}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Grand Total</span>
                        <span>{formatCurrency(cart.total_value)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={cart.items.length === 0}
            >
              {cart.supplier_count > 1 ? (
                <>
                  Create {cart.supplier_count} Purchase Orders
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparison Panel */}
      <SKUComparisonPanel
        open={showComparisonPanel}
        onOpenChange={setShowComparisonPanel}
        initialQuery={currentSearchQuery}
        onSelect={handleSelectOffer}
        selectedOfferId={
          selectedItems.length > 0
            ? selectedItems[selectedItems.length - 1].supplier_product_id
            : undefined
        }
      />
    </>
  );
}

