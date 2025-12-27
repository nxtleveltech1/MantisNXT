'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Tag, Search } from 'lucide-react';

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
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Tag className="text-primary h-5 w-5" />
          Product Brands
        </CardTitle>
        <CardDescription>
          Brands associated with products from this supplier
        </CardDescription>
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

