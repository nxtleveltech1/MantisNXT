'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Package, Building2, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  stock_qty: number;
  reorder_point?: number | null;
  cost_price?: number | null;
  sale_price?: number | null;
  unit_of_measure?: string | null;
}

interface AdvancedProductSearchProps {
  onProductSelect: (product: Product) => void;
  disabled?: boolean;
  placeholder?: string;
  excludeProductIds?: string[];
}

export function AdvancedProductSearch({
  onProductSelect,
  disabled,
  placeholder = 'Search products by name, SKU, category, brand...',
  excludeProductIds = [],
}: AdvancedProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    category?: string[];
    brand?: string[];
    supplier?: string[];
    stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
    minPrice?: number;
    maxPrice?: number;
  }>({
    stockStatus: 'all',
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Get unique values for filters
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch products when search or filters change
  useEffect(() => {
    if (open || debouncedSearch) {
      fetchProducts();
    }
  }, [open, debouncedSearch, filters]);

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      if (filters.category && filters.category.length > 0) {
        filters.category.forEach(cat => params.append('category', cat));
      }

      if (filters.brand && filters.brand.length > 0) {
        filters.brand.forEach(brand => params.append('brand', brand));
      }

      if (filters.supplier && filters.supplier.length > 0) {
        filters.supplier.forEach(sup => params.append('supplier', sup));
      }

      if (filters.minPrice !== undefined) {
        params.append('min_price', filters.minPrice.toString());
      }

      if (filters.maxPrice !== undefined) {
        params.append('max_price', filters.maxPrice.toString());
      }

      if (filters.stockStatus === 'low_stock') {
        params.append('low_stock', 'true');
      } else if (filters.stockStatus === 'out_of_stock') {
        params.append('out_of_stock', 'true');
      }

      const response = await fetch(`/api/inventory?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        let filtered = result.data || [];

        // Exclude already selected products
        if (excludeProductIds.length > 0) {
          filtered = filtered.filter((p: Product) => !excludeProductIds.includes(p.id));
        }

        // Extract unique values for filter options
        const categories = Array.from(new Set(filtered.map((p: Product) => p.category).filter(Boolean))) as string[];
        const brands = Array.from(new Set(filtered.map((p: Product) => p.brand).filter(Boolean))) as string[];
        const suppliers = Array.from(
          new Set(filtered.map((p: Product) => p.supplier_name).filter(Boolean))
        ) as string[];

        setAvailableCategories(categories.sort());
        setAvailableBrands(brands.sort());
        setAvailableSuppliers(suppliers.sort());

        // Apply client-side stock status filter
        if (filters.stockStatus === 'in_stock') {
          filtered = filtered.filter((p: Product) => p.stock_qty > (p.reorder_point || 0));
        }

        setProducts(filtered);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeFilterCount = useMemo(() => {
    return (
      (filters.category?.length || 0) +
      (filters.brand?.length || 0) +
      (filters.supplier?.length || 0) +
      (filters.stockStatus !== 'all' ? 1 : 0) +
      (filters.minPrice !== undefined ? 1 : 0) +
      (filters.maxPrice !== undefined ? 1 : 0)
    );
  }, [filters]);

  const toggleFilter = (filterType: 'category' | 'brand' | 'supplier', value: string) => {
    const current = filters[filterType] || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ ...filters, [filterType]: newValues.length > 0 ? newValues : undefined });
  };

  const clearFilters = () => {
    setFilters({ stockStatus: 'all' });
  };

  const handleSelect = (product: Product) => {
    onProductSelect(product);
    setOpen(false);
    setSearchTerm('');
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_qty === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (product.reorder_point && product.stock_qty <= product.reorder_point) {
      return { label: 'Low Stock', variant: 'secondary' as const };
    }
    return { label: 'In Stock', variant: 'default' as const };
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="text-muted-foreground">{placeholder}</span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[700px] p-0" align="start" onOpenAutoFocus={e => e.preventDefault()}>
        <Command shouldFilter={false}>
          <div className="border-b p-2">
            <CommandInput
              ref={inputRef}
              placeholder={placeholder}
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <div className="mt-2 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                  Clear filters
                </Button>
              )}
            </div>
            {showFilters && (
              <div className="mt-2 max-h-64 space-y-3 overflow-y-auto border-t pt-3">
                {availableCategories.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Category</p>
                    <div className="flex flex-wrap gap-1">
                      {availableCategories.slice(0, 10).map(cat => (
                        <Button
                          key={cat}
                          variant={filters.category?.includes(cat) ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleFilter('category', cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {availableBrands.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Brand</p>
                    <div className="flex flex-wrap gap-1">
                      {availableBrands.slice(0, 10).map(brand => (
                        <Button
                          key={brand}
                          variant={filters.brand?.includes(brand) ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleFilter('brand', brand)}
                        >
                          {brand}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {availableSuppliers.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Supplier</p>
                    <div className="flex flex-wrap gap-1">
                      {availableSuppliers.slice(0, 10).map(supplier => (
                        <Button
                          key={supplier}
                          variant={filters.supplier?.includes(supplier) ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleFilter('supplier', supplier)}
                        >
                          {supplier}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Stock Status</p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'in_stock', label: 'In Stock' },
                      { value: 'low_stock', label: 'Low Stock' },
                      { value: 'out_of_stock', label: 'Out of Stock' },
                    ].map(opt => (
                      <Button
                        key={opt.value}
                        variant={filters.stockStatus === opt.value ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setFilters({ ...filters, stockStatus: opt.value as any })}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min price (ZAR)"
                    value={filters.minPrice || ''}
                    onChange={e =>
                      setFilters({
                        ...filters,
                        minPrice: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Max price (ZAR)"
                    value={filters.maxPrice || ''}
                    onChange={e =>
                      setFilters({
                        ...filters,
                        maxPrice: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading products...</CommandEmpty>
            ) : products.length === 0 ? (
              <CommandEmpty>No products found. Try adjusting your search or filters.</CommandEmpty>
            ) : (
              <CommandGroup>
                {products.map(product => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <CommandItem
                      key={product.id}
                      value={product.id}
                      onSelect={() => handleSelect(product)}
                      className="cursor-pointer"
                    >
                      <div className="flex w-full items-start gap-3 py-2">
                        <div className="mt-1">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            <Badge variant={stockStatus.variant} className="text-xs">
                              {stockStatus.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {product.sku}
                            {product.category && ` • ${product.category}`}
                            {product.brand && ` • ${product.brand}`}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {product.supplier_name && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {product.supplier_name}
                              </div>
                            )}
                            <div>Stock: {product.stock_qty} {product.unit_of_measure || 'units'}</div>
                            {product.sale_price !== null && (
                              <div className="font-medium">Price: {formatCurrency(product.sale_price)}</div>
                            )}
                            {product.cost_price !== null && (
                              <div>Cost: {formatCurrency(product.cost_price)}</div>
                            )}
                          </div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

