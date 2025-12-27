'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, FolderTree, Search } from 'lucide-react';

interface Category {
  category_id: string;
  category_name: string;
  category_path: string;
  level: number;
  parent_id: string | null;
  product_count: number;
}

interface SupplierCategoriesTabProps {
  supplierId: string;
}

export function SupplierCategoriesTab({ supplierId }: SupplierCategoriesTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCategories();
  }, [supplierId, search]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const url = `/api/suppliers/${supplierId}/categories${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cat.category_name.toLowerCase().includes(searchLower) ||
      cat.category_path?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <FolderTree className="text-primary h-5 w-5" />
          Product Categories
        </CardTitle>
        <CardDescription>
          Categories associated with products from this supplier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search categories..."
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
        ) : filteredCategories.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            <FolderTree className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="font-medium">No categories found</p>
            <p className="mt-1 text-sm">
              {search ? 'Try a different search term' : 'This supplier has no categorized products'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredCategories.map((category) => (
                <div
                  key={category.category_id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold">{category.category_name}</span>
                      <Badge variant="outline" className="text-xs">
                        Level {category.level}
                      </Badge>
                    </div>
                    {category.category_path && (
                      <div className="text-muted-foreground text-sm">
                        {category.category_path}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
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

