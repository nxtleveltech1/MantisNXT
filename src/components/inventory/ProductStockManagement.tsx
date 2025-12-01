'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Package,
  Plus,
  Search,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Building2,
  BarChart3,
  Eye,
  Star,
} from 'lucide-react';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import type { Product } from '@/lib/types/inventory';
import { format } from 'date-fns';

interface StockMovement {
  id: string;
  type: 'add_to_inventory' | 'adjust_stock' | 'transfer' | 'remove_from_inventory';
  productId: string;
  quantity: number;
  unitCost: number;
  location: string;
  reason: string;
  notes?: string;
  timestamp: string;
}

interface BulkStockOperation {
  products: {
    id: string;
    name: string;
    sku?: string;
    category: string;
    supplier: string;
    currentStock?: number;
    targetStock: number;
    unitCost: number;
    location: string;
    reorderPoint: number;
    maxStock: number;
  }[];
  operation: 'add_to_inventory' | 'bulk_adjust' | 'bulk_transfer';
  reason: string;
  notes?: string;
}

export default function ProductStockManagement() {
  const {
    items,
    products,
    suppliers,
    loading,
    fetchItems,
    fetchProducts,
    fetchSuppliers,
    adjustInventory,
  } = useInventoryStore();

  const { addNotification } = useNotificationStore();

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('all_suppliers');
  const [categoryFilter, setCategoryFilter] = useState<string>('all_categories');
  const [statusFilter, setStatusFilter] = useState<string>('all_statuses');
  const [showBulkOperation, setShowBulkOperation] = useState(false);
  const [showAddToInventory, setShowAddToInventory] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockOperations, setStockOperations] = useState<StockMovement[]>([]);
  const [operationInProgress, setOperationInProgress] = useState(false);

  // Form states for bulk operations
  const [bulkOperation, setBulkOperation] = useState<BulkStockOperation>({
    products: [],
    operation: 'add_to_inventory',
    reason: '',
    notes: '',
  });

  // Form states for individual product operations
  const [productForm, setProductForm] = useState({
    quantity: 0,
    unitCost: 0,
    location: 'WAREHOUSE-A',
    reorderPoint: 10,
    maxStock: 1000,
    reason: 'initial_stock',
    notes: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchItems(), fetchProducts(), fetchSuppliers()]);
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Failed to load data',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };
    loadData();
  }, [addNotification, fetchItems, fetchProducts, fetchSuppliers]);

  // Get products that are not yet in inventory or need stock management
  const availableProducts = useMemo(() => {
    return products
      .map(product => {
        const supplier = suppliers.find(s => s.id === product.supplier_id);
        const inventoryItem = items.find(item => item.product_id === product.id);

        return {
          ...product,
          supplier,
          inventoryItem,
          isInInventory: !!inventoryItem,
          currentStock: inventoryItem?.current_stock || 0,
          stockStatus: inventoryItem?.stock_status || 'out_of_stock',
        };
      })
      .filter(product => {
        const matchesSearch =
          !searchTerm ||
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesSupplier =
          !supplierFilter ||
          supplierFilter === 'all_suppliers' ||
          product.supplier_id === supplierFilter;
        const matchesCategory =
          !categoryFilter ||
          categoryFilter === 'all_categories' ||
          product.category === categoryFilter;
        const matchesStatus =
          !statusFilter ||
          statusFilter === 'all_statuses' ||
          (statusFilter === 'not_in_inventory' && !product.isInInventory) ||
          (statusFilter === 'in_inventory' && product.isInInventory) ||
          (statusFilter === 'low_stock' &&
            product.inventoryItem?.current_stock <= (product.inventoryItem?.reorder_point || 0)) ||
          (statusFilter === 'out_of_stock' && product.currentStock === 0);

        return matchesSearch && matchesSupplier && matchesCategory && matchesStatus;
      });
  }, [products, suppliers, items, searchTerm, supplierFilter, categoryFilter, statusFilter]);

  const categories = [...new Set(products.map(p => p.category))].sort();
  const locations = ['WAREHOUSE-A', 'WAREHOUSE-B', 'STORE-FRONT', 'QUARANTINE', 'STAGING'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (product: unknown) => {
    if (!product.isInInventory) {
      return (
        <Badge variant="outline" className="border-gray-500 text-gray-700">
          Not in Inventory
        </Badge>
      );
    }

    if (product.currentStock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }

    if (product.inventoryItem?.current_stock <= (product.inventoryItem?.reorder_point || 0)) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-700">
          Low Stock
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        In Stock
      </Badge>
    );
  };

  const handleAddToInventory = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setOperationInProgress(true);
    try {
      await adjustInventory({
        inventory_item_id: productId, // This would be handled differently in real implementation
        adjustment_type: 'increase',
        quantity: productForm.quantity,
        reason_code: productForm.reason,
        notes: productForm.notes,
        unit_cost_zar: productForm.unitCost,
      });

      setStockOperations(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'add_to_inventory',
          productId,
          quantity: productForm.quantity,
          unitCost: productForm.unitCost,
          location: productForm.location,
          reason: productForm.reason,
          notes: productForm.notes,
          timestamp: new Date().toISOString(),
        },
      ]);

      addNotification({
        type: 'success',
        title: 'Product added to inventory',
        message: `${product.name} has been added with ${productForm.quantity} units`,
      });

      setShowAddToInventory(false);
      setSelectedProduct(null);
      setProductForm({
        quantity: 0,
        unitCost: 0,
        location: 'WAREHOUSE-A',
        reorderPoint: 10,
        maxStock: 1000,
        reason: 'initial_stock',
        notes: '',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to add product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleBulkOperation = async () => {
    if (selectedProducts.size === 0) return;

    setOperationInProgress(true);
    try {
      const selectedProductData = availableProducts
        .filter(p => selectedProducts.has(p.id))
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku || '',
          category: p.category,
          supplier: p.supplier?.name || 'Unknown',
          currentStock: p.currentStock,
          targetStock: 100, // Default target, would be customizable
          unitCost: p.unit_cost_zar,
          location: 'WAREHOUSE-A',
          reorderPoint: 10,
          maxStock: 1000,
        }));

      setBulkOperation(prev => ({
        ...prev,
        products: selectedProductData,
      }));

      // Here you would implement the actual bulk operation
      for (const productId of selectedProducts) {
        await adjustInventory({
          inventory_item_id: productId,
          adjustment_type: 'increase',
          quantity: 100, // Default quantity
          reason_code: bulkOperation.reason,
          notes: bulkOperation.notes,
        });
      }

      addNotification({
        type: 'success',
        title: 'Bulk operation completed',
        message: `${selectedProducts.size} products processed successfully`,
      });

      setSelectedProducts(new Set());
      setShowBulkOperation(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Bulk operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setOperationInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Stock Management</h1>
          <p className="text-muted-foreground">
            Manage product inventory levels, add new products to inventory, and perform bulk
            operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          {selectedProducts.size > 0 && (
            <Button onClick={() => setShowBulkOperation(true)}>
              <Package className="mr-2 h-4 w-4" />
              Bulk Operation ({selectedProducts.size})
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Available</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableProducts.length}</div>
            <p className="text-muted-foreground text-xs">Total products in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Inventory</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {availableProducts.filter(p => p.isInInventory).length}
            </div>
            <p className="text-muted-foreground text-xs">Products with stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not in Inventory</CardTitle>
            <XCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {availableProducts.filter(p => !p.isInInventory).length}
            </div>
            <p className="text-muted-foreground text-xs">Products to add</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                availableProducts.filter(
                  p =>
                    p.currentStock === 0 ||
                    p.inventoryItem?.current_stock <= (p.inventoryItem?.reorder_point || 0)
                ).length
              }
            </div>
            <p className="text-muted-foreground text-xs">Low/out of stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search products, SKUs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search products by name or SKU"
                aria-describedby="search-description"
              />
              <div id="search-description" className="sr-only">
                Search through all products by name or SKU code
              </div>
            </div>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-48" aria-label="Filter by supplier">
                <SelectValue placeholder="All suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_suppliers">All suppliers</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48" aria-label="Filter by product category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_categories">All categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" aria-label="Filter by stock status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_statuses">All statuses</SelectItem>
                <SelectItem value="not_in_inventory">Not in Inventory</SelectItem>
                <SelectItem value="in_inventory">In Inventory</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products ({availableProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedProducts.size === availableProducts.length &&
                      availableProducts.length > 0
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedProducts(new Set(availableProducts.map(p => p.id)));
                      } else {
                        setSelectedProducts(new Set());
                      }
                    }}
                    className="focus:ring-primary rounded focus:ring-2 focus:ring-offset-1"
                    aria-label={`Select all ${availableProducts.length} products`}
                    title={`Select all products (${availableProducts.length} items)`}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Supplier
                  </div>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={e => {
                        const newSelection = new Set(selectedProducts);
                        if (e.target.checked) {
                          newSelection.add(product.id);
                        } else {
                          newSelection.delete(product.id);
                        }
                        setSelectedProducts(newSelection);
                      }}
                      className="focus:ring-primary rounded focus:ring-2 focus:ring-offset-1"
                      aria-label={`Select product ${product.name}`}
                      aria-describedby={`product-${product.id}-status`}
                    />
                    <div id={`product-${product.id}-status`} className="sr-only">
                      {product.name} -{' '}
                      {product.isInInventory
                        ? `${product.currentStock} units in stock`
                        : 'Not in inventory'}{' '}
                      - {formatCurrency(product.unit_cost_zar)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.sku && (
                        <code className="text-muted-foreground text-sm">{product.sku}</code>
                      )}
                      {product.description && (
                        <p className="text-muted-foreground text-sm">
                          {product.description.length > 50
                            ? `${product.description.substring(0, 50)}...`
                            : product.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-semibold text-white">
                          {(product.supplier?.name || 'U').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {product.supplier?.name || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {product.supplier?.status || 'unknown'}
                            </Badge>
                            {product.supplier?.preferred_supplier && (
                              <Star className="h-3 w-3 fill-current text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {product.category.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.isInInventory ? (
                      <div>
                        <p className="font-medium">
                          {product.currentStock} {product.unit_of_measure}
                        </p>
                        {product.inventoryItem && (
                          <p className="text-muted-foreground text-xs">
                            Reorder: {product.inventoryItem.reorder_point}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.unit_cost_zar)}
                  </TableCell>
                  <TableCell>{getStatusBadge(product)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {!product.isInInventory ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProduct(product);
                            setProductForm(prev => ({
                              ...prev,
                              unitCost: product.unit_cost_zar,
                            }));
                            setShowAddToInventory(true);
                          }}
                          aria-label={`Add ${product.name} to inventory`}
                        >
                          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                          Add
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Adjust stock levels for ${product.name}`}
                        >
                          <BarChart3 className="mr-1 h-4 w-4" aria-hidden="true" />
                          Adjust
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`View details for ${product.name}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Operations */}
      {stockOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stockOperations.slice(-5).map(operation => {
                const product = products.find(p => p.id === operation.productId);
                return (
                  <div
                    key={operation.id}
                    className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2 text-green-600">
                        <Plus className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                        <p className="text-muted-foreground text-sm">
                          {format(new Date(operation.timestamp), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">+{operation.quantity}</p>
                      <p className="text-muted-foreground text-sm">{operation.location}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add to Inventory Dialog */}
      <Dialog open={showAddToInventory} onOpenChange={setShowAddToInventory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Product to Inventory</DialogTitle>
            <DialogDescription>
              Add {selectedProduct?.name} to your inventory system with initial stock levels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Product Info */}
            {selectedProduct && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Package className="text-primary h-8 w-8" />
                  <div>
                    <h3 className="font-medium">{selectedProduct.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {selectedProduct.sku && `SKU: ${selectedProduct.sku} • `}
                      {selectedProduct.category.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Initial Stock Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={productForm.quantity}
                  onChange={e =>
                    setProductForm(prev => ({
                      ...prev,
                      quantity: parseInt(e.target.value) || 0,
                    }))
                  }
                  aria-describedby="quantity-help"
                  required
                />
                <div id="quantity-help" className="sr-only">
                  Enter the initial number of units to add to inventory
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit Cost (ZAR)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.unitCost}
                  onChange={e =>
                    setProductForm(prev => ({
                      ...prev,
                      unitCost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  aria-describedby="cost-help"
                  required
                />
                <div id="cost-help" className="sr-only">
                  Enter the cost per unit in South African Rand
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Storage Location</Label>
                <Select
                  value={productForm.location}
                  onValueChange={value => setProductForm(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger aria-label="Select storage location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  value={productForm.reorderPoint}
                  onChange={e =>
                    setProductForm(prev => ({
                      ...prev,
                      reorderPoint: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStock">Maximum Stock Level</Label>
                <Input
                  id="maxStock"
                  type="number"
                  min="0"
                  value={productForm.maxStock}
                  onChange={e =>
                    setProductForm(prev => ({
                      ...prev,
                      maxStock: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select
                  value={productForm.reason}
                  onValueChange={value => setProductForm(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_stock">Initial Stock</SelectItem>
                    <SelectItem value="restock">Restock</SelectItem>
                    <SelectItem value="supplier_delivery">Supplier Delivery</SelectItem>
                    <SelectItem value="return_to_stock">Return to Stock</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this stock addition..."
                value={productForm.notes}
                onChange={e => setProductForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="mb-2 font-medium">Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(productForm.quantity * productForm.unitCost)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <span className="ml-2 font-medium">{productForm.location}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToInventory(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedProduct && handleAddToInventory(selectedProduct.id)}
              disabled={operationInProgress || productForm.quantity <= 0}
              aria-describedby="add-button-status"
            >
              {operationInProgress && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Add to Inventory
            </Button>
            <div id="add-button-status" className="sr-only">
              {operationInProgress
                ? 'Adding product to inventory...'
                : productForm.quantity <= 0
                  ? 'Enter a quantity greater than 0 to add'
                  : 'Ready to add product to inventory'}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Operation Dialog */}
      <Dialog open={showBulkOperation} onOpenChange={setShowBulkOperation}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Stock Operation</DialogTitle>
            <DialogDescription>
              Perform bulk operations on {selectedProducts.size} selected products.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Operation Type</Label>
                <Select
                  value={bulkOperation.operation}
                  onValueChange={(value: unknown) =>
                    setBulkOperation(prev => ({ ...prev, operation: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add_to_inventory">Add to Inventory</SelectItem>
                    <SelectItem value="bulk_adjust">Bulk Adjust Stock</SelectItem>
                    <SelectItem value="bulk_transfer">Bulk Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Select
                  value={bulkOperation.reason}
                  onValueChange={value => setBulkOperation(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_stock">Initial Stock</SelectItem>
                    <SelectItem value="supplier_delivery">Supplier Delivery</SelectItem>
                    <SelectItem value="restock">Restock</SelectItem>
                    <SelectItem value="adjustment">Inventory Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Progress</Label>
                <Progress value={operationInProgress ? 50 : 0} className="mt-2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes for this bulk operation..."
                value={bulkOperation.notes}
                onChange={e => setBulkOperation(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableProducts
                    .filter(p => selectedProducts.has(p.id))
                    .map(product => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.sku && (
                              <code className="text-muted-foreground text-sm">{product.sku}</code>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.supplier?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          {product.isInInventory ? product.currentStock : 'Not in inventory'}
                        </TableCell>
                        <TableCell>{formatCurrency(product.unit_cost_zar)}</TableCell>
                        <TableCell>{getStatusBadge(product)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkOperation(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkOperation}
              disabled={operationInProgress || !bulkOperation.reason}
            >
              {operationInProgress && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Execute Bulk Operation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
