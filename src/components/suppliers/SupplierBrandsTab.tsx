'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Tag, Search, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Brand {
  brand_id: string;
  brand_name: string;
  description?: string | null;
  logo_url?: string | null;
  website?: string | null;
  product_count: number;
}

interface SupplierBrandsTabProps {
  supplierId: string;
}

export function SupplierBrandsTab({ supplierId }: SupplierBrandsTabProps) {
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    website: '',
  });

  useEffect(() => {
    loadBrands();
  }, [supplierId, search]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const url = `/api/suppliers/${supplierId}/brands${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBrands(data.data || []);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = brands.filter((brand) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return brand.brand_name.toLowerCase().includes(searchLower);
  });

  const handleCreateBrand = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Brand name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          logo_url: formData.logo_url.trim() || null,
          website: formData.website.trim() || null,
          supplier_id: supplierId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to create brand');
      }

      toast({
        title: 'Success',
        description: data.message || 'Brand created successfully',
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        description: '',
        logo_url: '',
        website: '',
      });
      setDialogOpen(false);

      // Refresh brand list
      await loadBrands();
    } catch (error) {
      console.error('Error creating brand:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create brand',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Tag className="text-primary h-5 w-5" />
              Product Brands
            </CardTitle>
            <CardDescription>
              Brands associated with products from this supplier
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Brand
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Brand</DialogTitle>
                <DialogDescription>
                  Create a new brand that will be available for this supplier and discount rules.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">
                    Brand Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="brand-name"
                    placeholder="Enter brand name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-description">Description</Label>
                  <Textarea
                    id="brand-description"
                    placeholder="Enter brand description (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={creating}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-logo">Logo URL</Label>
                  <Input
                    id="brand-logo"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-website">Website</Label>
                  <Input
                    id="brand-website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    disabled={creating}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBrand} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Brand
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            <Tag className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="font-medium">No brands found</p>
            <p className="mt-1 text-sm">
              {search ? 'Try a different search term' : 'This supplier has no branded products'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredBrands.map((brand) => (
                <div
                  key={brand.brand_id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {brand.logo_url && (
                      <img
                        src={brand.logo_url}
                        alt={brand.brand_name}
                        className="h-12 w-12 rounded object-contain"
                      />
                    )}
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-semibold">{brand.brand_name}</span>
                        {brand.website && (
                          <a
                            href={brand.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs hover:underline"
                          >
                            Website
                          </a>
                        )}
                      </div>
                      {brand.description && (
                        <div className="text-muted-foreground text-sm">{brand.description}</div>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {brand.product_count} {brand.product_count === 1 ? 'product' : 'products'}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

