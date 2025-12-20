'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Edit, Trash2, Package, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ChannelProduct {
  id: string;
  product_id: string;
  channel_product_id?: string | null;
  channel_sku?: string | null;
  is_active: boolean;
  sync_enabled: boolean;
  price_override?: number | null;
  title_override?: string | null;
  sync_status: 'pending' | 'synced' | 'error';
  error_message?: string | null;
  last_synced_at?: string | null;
}

interface Product {
  product_id: string;
  name: string;
  sku: string;
  sale_price?: number;
}

interface ProductMappingTableProps {
  channelId: string;
}

export function ProductMappingTable({ channelId }: ProductMappingTableProps) {
  const [products, setProducts] = useState<ChannelProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  useEffect(() => {
    fetchChannelProducts();
    fetchAvailableProducts();
  }, [channelId]);

  const fetchChannelProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/sales-channels/${channelId}/products`);
      const result = await response.json();

      if (result.success) {
        setProducts(result.data || []);
      } else {
        toast.error('Failed to fetch channel products');
      }
    } catch (error) {
      console.error('Error fetching channel products:', error);
      toast.error('Error loading channel products');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const response = await fetch('/api/catalog/products?limit=1000');
      const result = await response.json();

      if (result.success || result.data) {
        setAvailableProducts(result.data || result.products || []);
      }
    } catch (error) {
      console.error('Error fetching available products:', error);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProductId) {
      toast.error('Please select a product');
      return;
    }

    try {
      const response = await fetch(`/api/v1/sales-channels/${channelId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Product added to channel');
        setDialogOpen(false);
        setSelectedProductId('');
        fetchChannelProducts();
      } else {
        toast.error(result.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this product from the channel?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/sales-channels/${channelId}/products/${productId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Product removed from channel');
        fetchChannelProducts();
      } else {
        toast.error(result.error || 'Failed to remove product');
      }
    } catch (error) {
      console.error('Error removing product:', error);
      toast.error('Failed to remove product');
    }
  };

  const handleSyncProducts = async () => {
    try {
      const response = await fetch(`/api/v1/sales-channels/${channelId}/products/sync`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Synced ${result.itemsSucceeded} products`);
        fetchChannelProducts();
      } else {
        toast.error(result.error || 'Failed to sync products');
      }
    } catch (error) {
      console.error('Error syncing products:', error);
      toast.error('Failed to sync products');
    }
  };

  const getProductName = (productId: string) => {
    const product = availableProducts.find(p => p.product_id === productId);
    return product?.name || productId;
  };

  const getSyncStatusBadge = (status: string, error?: string | null) => {
    switch (status) {
      case 'synced':
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle2 className="h-3 w-3" />
            Synced
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const filteredProducts = products.filter(p =>
    getProductName(p.product_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.channel_sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Channel Products</CardTitle>
            <CardDescription>Manage products available on this channel</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchChannelProducts}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleSyncProducts}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Products
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Product to Channel</DialogTitle>
                  <DialogDescription>
                    Select a product to add to this sales channel
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts
                          .filter(p => !products.some(cp => cp.product_id === p.product_id))
                          .map(product => (
                            <SelectItem key={product.product_id} value={product.product_id}>
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddProduct}>Add Product</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Add products to make them available on this channel'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Channel SKU</TableHead>
                  <TableHead>Channel Product ID</TableHead>
                  <TableHead>Price Override</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sync Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {getProductName(product.product_id)}
                    </TableCell>
                    <TableCell>{product.channel_sku || '-'}</TableCell>
                    <TableCell>{product.channel_product_id || '-'}</TableCell>
                    <TableCell>
                      {product.price_override
                        ? new Intl.NumberFormat('en-ZA', {
                            style: 'currency',
                            currency: 'ZAR',
                          }).format(product.price_override)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getSyncStatusBadge(product.sync_status, product.error_message)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // TODO: Open edit dialog
                            toast.info('Edit functionality coming soon');
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProduct(product.product_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

