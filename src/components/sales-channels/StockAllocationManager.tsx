'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Edit, Trash2, Package, MapPin } from 'lucide-react';
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

interface StockAllocation {
  id: string;
  product_id: string;
  location_id?: string | null;
  allocation_type: 'reserved' | 'virtual';
  allocated_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock_level: number;
  max_stock_level?: number | null;
  auto_replenish: boolean;
}

interface Product {
  product_id: string;
  name: string;
  sku: string;
}

interface Location {
  location_id: string;
  name: string;
  code: string;
}

interface StockAllocationManagerProps {
  channelId: string;
}

export function StockAllocationManager({ channelId }: StockAllocationManagerProps) {
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    location_id: '',
    allocation_type: 'virtual' as 'reserved' | 'virtual',
    quantity: 0,
    min_stock_level: 0,
    max_stock_level: '',
    auto_replenish: false,
  });

  useEffect(() => {
    fetchStockAllocations();
    fetchProducts();
    fetchLocations();
  }, [channelId]);

  const fetchStockAllocations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/sales-channels/${channelId}/stock`);
      const result = await response.json();

      if (result.success) {
        setAllocations(result.data || []);
      } else {
        toast.error('Failed to fetch stock allocations');
      }
    } catch (error) {
      console.error('Error fetching stock allocations:', error);
      toast.error('Error loading stock allocations');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/catalog/products?limit=1000');
      const result = await response.json();

      if (result.success || result.data) {
        setProducts(result.data || result.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/inventory/locations');
      const result = await response.json();

      if (result.success || result.data) {
        setLocations(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleAllocateStock = async () => {
    if (!formData.product_id || formData.quantity <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`/api/v1/sales-channels/${channelId}/stock/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: formData.product_id,
          location_id: formData.location_id || null,
          quantity: formData.quantity,
          allocation_type: formData.allocation_type,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Stock allocated successfully');
        setDialogOpen(false);
        setFormData({
          product_id: '',
          location_id: '',
          allocation_type: 'virtual',
          quantity: 0,
          min_stock_level: 0,
          max_stock_level: '',
          auto_replenish: false,
        });
        fetchStockAllocations();
      } else {
        toast.error(result.error || 'Failed to allocate stock');
      }
    } catch (error) {
      console.error('Error allocating stock:', error);
      toast.error('Failed to allocate stock');
    }
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.product_id === productId);
    return product?.name || productId;
  };

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return 'All Locations';
    const location = locations.find(l => l.location_id === locationId);
    return location?.name || locationId;
  };

  const filteredAllocations = allocations.filter(a =>
    getProductName(a.product_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getLocationName(a.location_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stock Allocations</CardTitle>
            <CardDescription>Manage stock allocation for this channel</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchStockAllocations}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Allocate Stock
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Allocate Stock</DialogTitle>
                  <DialogDescription>
                    Allocate stock to this sales channel
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={formData.product_id}
                      onValueChange={value => setFormData({ ...formData, product_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.product_id} value={product.product_id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location (optional)</Label>
                    <Select
                      value={formData.location_id}
                      onValueChange={value => setFormData({ ...formData, location_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Locations</SelectItem>
                        {locations.map(location => (
                          <SelectItem key={location.location_id} value={location.location_id}>
                            {location.name} ({location.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Allocation Type</Label>
                    <Select
                      value={formData.allocation_type}
                      onValueChange={value =>
                        setFormData({
                          ...formData,
                          allocation_type: value as 'reserved' | 'virtual',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="virtual">Virtual (Soft Allocation)</SelectItem>
                        <SelectItem value="reserved">Reserved (Dedicated Stock)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={e =>
                        setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 0 })
                      }
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Stock Level</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.min_stock_level}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          min_stock_level: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Stock Level (optional)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.max_stock_level}
                      onChange={e => setFormData({ ...formData, max_stock_level: e.target.value })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAllocateStock}>Allocate</Button>
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
              placeholder="Search allocations..."
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
        ) : filteredAllocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No allocations found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Allocate stock to make products available on this channel'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Min Level</TableHead>
                  <TableHead>Max Level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllocations.map(allocation => (
                  <TableRow key={allocation.id}>
                    <TableCell className="font-medium">
                      {getProductName(allocation.product_id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {getLocationName(allocation.location_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={allocation.allocation_type === 'reserved' ? 'default' : 'secondary'}>
                        {allocation.allocation_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{allocation.allocated_quantity}</TableCell>
                    <TableCell>{allocation.reserved_quantity}</TableCell>
                    <TableCell className="font-medium">{allocation.available_quantity}</TableCell>
                    <TableCell>{allocation.min_stock_level}</TableCell>
                    <TableCell>{allocation.max_stock_level || '∞'}</TableCell>
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
                          onClick={() => {
                            // TODO: Implement delete
                            toast.info('Delete functionality coming soon');
                          }}
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

