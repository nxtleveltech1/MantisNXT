'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, FolderTree, Search, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Category {
  category_id: string;
  category_name: string;
  category_path: string;
  level: number;
  parent_id: string | null;
  product_count: number;
}

interface CategoryOption {
  id: string;
  name: string;
  path: string;
  level: number;
  parentId: string | null;
}

interface SupplierCategoriesTabProps {
  supplierId: string;
}

export function SupplierCategoriesTab({ supplierId }: SupplierCategoriesTabProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [parentCategories, setParentCategories] = useState<CategoryOption[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
  });

  useEffect(() => {
    loadCategories();
  }, [supplierId, search]);

  useEffect(() => {
    if (dialogOpen) {
      loadParentCategories();
    }
  }, [dialogOpen]);

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

  const loadParentCategories = async () => {
    try {
      setLoadingParents(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (Array.isArray(data)) {
        setParentCategories(data);
      }
    } catch (error) {
      console.error('Error loading parent categories:', error);
    } finally {
      setLoadingParents(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          parentId: formData.parentId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create category');
      }

      toast({
        title: 'Success',
        description: 'Category created successfully',
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        parentId: '',
      });
      setDialogOpen(false);

      // Refresh category list
      await loadCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create category',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <FolderTree className="text-primary h-5 w-5" />
              Product Categories
            </CardTitle>
            <CardDescription>
              Categories associated with products from this supplier
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new category that will be available for this supplier and discount rules.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">
                    Category Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="category-name"
                    placeholder="Enter category name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-parent">Parent Category (Optional)</Label>
                  <Select
                    value={formData.parentId}
                    onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                    disabled={creating || loadingParents}
                  >
                    <SelectTrigger id="category-parent">
                      <SelectValue placeholder="Select parent category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (Top Level)</SelectItem>
                      {parentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.path || cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingParents && (
                    <p className="text-muted-foreground text-sm">Loading categories...</p>
                  )}
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
                <Button onClick={handleCreateCategory} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Category
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

