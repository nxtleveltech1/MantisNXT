'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Tag,
  FolderTree,
  DollarSign,
  Warehouse,
  History,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Barcode,
  Building2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface ProductTag {
  tag_id: string;
  name: string;
  type: 'ai' | 'manual' | 'auto' | 'custom' | string;
  assigned_at?: string;
  assigned_by?: string;
}

interface CategoryInfo {
  category_id?: string;
  category_name?: string;
  category_parent_id?: string;
  category_path?: string;
  category_level?: number;
  category_is_active?: boolean;
}

interface ProductData {
  supplier_product_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;
  supplier_sku: string;
  name_from_supplier: string;
  brand_name?: string;
  manufacturer?: string;
  model?: string;
  series_range?: string;
  mpn?: string;
  attrs_json?: {
    description?: string;
    short_description?: string;
    cost_including?: number;
    cost_excluding?: number;
    rsp?: number;
    base_discount?: number;
    stock_status?: string;
    new_stock_eta?: string;
    [key: string]: unknown;
  };
  base_discount?: number;
  cost_after_discount?: number;
  cost_ex_vat?: number;
  category_id?: string;
  category_name?: string;
  category_parent_id?: string;
  category_path?: string;
  category_level?: number;
  category_is_active?: boolean;
  current_price?: number;
  currency?: string;
  previous_price?: number;
  previous_price_valid_to?: string;
  qty_on_hand?: number;
  stock_as_of_ts?: string;
  stock_status?: string;
  new_stock_eta?: string;
  barcode?: string;
  uom?: string;
  pack_size?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  is_active?: boolean;
  tags?: ProductTag[] | string[];
  ai_reasoning?: string;
  ai_categorization_status?: string;
}

interface ProductProfileDialogProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductProfileDialog({
  productId,
  open,
  onOpenChange,
}: ProductProfileDialogProps) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  useEffect(() => {
    if (open && productId) {
      fetchProductDetails();
      fetchPriceHistory();
    } else {
      setProduct(null);
      setPriceHistory([]);
      setError(null);
    }
  }, [open, productId]);

  const fetchProductDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/catalog/products/${productId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      const data = await response.json();
      if (data.success) {
        setProduct(data.data);
      } else {
        throw new Error(data.error || 'Failed to load product');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load product details';
      setError(errorMessage);
      console.error('Error fetching product details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      const response = await fetch(`/api/catalog/products/${productId}/price-history?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setPriceHistory(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching price history:', err);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: product?.currency || 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getPriceChange = () => {
    if (!product?.current_price || !product?.previous_price) return null;
    const diff = product.current_price - product.previous_price;
    const percent = ((diff / product.previous_price) * 100).toFixed(1);
    return {
      amount: diff,
      percent: Math.abs(parseFloat(percent)),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'none',
    };
  };

  const normalizeTags = (): ProductTag[] => {
    if (!product?.tags) return [];
    if (Array.isArray(product.tags)) {
      if (product.tags.length === 0) return [];
      // Check if it's an array of strings or objects
      if (typeof product.tags[0] === 'string') {
        return (product.tags as string[]).map(tag => ({
          tag_id: tag,
          name: tag,
          type: 'auto',
        }));
      }
      return product.tags as ProductTag[];
    }
    return [];
  };

  if (!open) return null;

  const tags = normalizeTags();
  const priceChange = getPriceChange();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6" />
            Product Profile
          </DialogTitle>
          <DialogDescription>
            Complete product profile: Tags, Category, Pricing, Inventory, and all related data
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="space-y-2 text-center">
              <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2" />
              <p className="text-muted-foreground text-sm">Loading product details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="space-y-2 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          </div>
        ) : product ? (
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="overview">
                  <Info className="mr-2 h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tags">
                  <Tag className="mr-2 h-4 w-4" />
                  Tags ({tags.length})
                </TabsTrigger>
                <TabsTrigger value="category">
                  <FolderTree className="mr-2 h-4 w-4" />
                  Category
                </TabsTrigger>
                <TabsTrigger value="brand">
                  <Building2 className="mr-2 h-4 w-4" />
                  Brand
                </TabsTrigger>
                <TabsTrigger value="pricing">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="inventory">
                  <Warehouse className="mr-2 h-4 w-4" />
                  Inventory
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="mr-2 h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Info className="h-5 w-5" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Product Name</p>
                          <p className="mt-1 text-base font-semibold">
                            {product.name_from_supplier}
                          </p>
                          {product.attrs_json?.short_description && (
                            <p className="text-muted-foreground mt-1 text-xs italic">
                              {String(product.attrs_json.short_description)}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Supplier SKU</p>
                          <p className="mt-1 font-mono text-base">{product.supplier_sku}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Supplier</p>
                          <p className="mt-1 text-base">{product.supplier_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Brand</p>
                          <p className="mt-1 text-base font-semibold">
                            {product.brand_name || '-'}
                          </p>
                        </div>
                        {product.barcode && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Barcode</p>
                            <p className="mt-1 font-mono text-base">{product.barcode}</p>
                          </div>
                        )}
                        {product.uom && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">
                              Unit of Measure
                            </p>
                            <p className="mt-1 text-base">{product.uom}</p>
                          </div>
                        )}
                        {product.manufacturer && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Manufacturer</p>
                            <p className="mt-1 text-base">{product.manufacturer}</p>
                          </div>
                        )}
                        {product.model && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Model</p>
                            <p className="mt-1 font-mono text-base">{product.model}</p>
                          </div>
                        )}
                        {product.series_range && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Series Range</p>
                            <p className="mt-1 text-base">{product.series_range}</p>
                          </div>
                        )}
                        {product.mpn && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">MPN</p>
                            <p className="mt-1 font-mono text-base">{product.mpn}</p>
                          </div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground mb-2 text-sm font-medium">
                          Description
                        </p>
                        <div className="bg-muted rounded-lg p-3 text-sm">
                          {product.attrs_json?.description ? (
                            <div className="whitespace-pre-wrap">
                              {String(product.attrs_json.description)}
                            </div>
                          ) : product.name_from_supplier ? (
                            <div className="text-muted-foreground italic">
                              {product.name_from_supplier}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">No description available</div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {product.ai_categorization_status && (
                          <Badge variant="outline">
                            {product.ai_categorization_status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <DollarSign className="h-5 w-5" />
                        Quick Pricing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Current Price</p>
                          <p className="mt-1 text-2xl font-bold">
                            {formatCurrency(product.current_price)}
                          </p>
                        </div>
                        {product.previous_price && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">
                              Previous Price
                            </p>
                            <p className="mt-1 text-lg">{formatCurrency(product.previous_price)}</p>
                          </div>
                        )}
                        {priceChange && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">
                              Price Change
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              {priceChange.direction === 'up' && (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              )}
                              {priceChange.direction === 'down' && (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              {priceChange.direction === 'none' && (
                                <Minus className="text-muted-foreground h-4 w-4" />
                              )}
                              <span
                                className={`text-lg font-semibold ${
                                  priceChange.direction === 'up'
                                    ? 'text-green-600'
                                    : priceChange.direction === 'down'
                                      ? 'text-red-600'
                                      : 'text-muted-foreground'
                                }`}
                              >
                                {formatCurrency(Math.abs(priceChange.amount))} (
                                {priceChange.percent}%)
                              </span>
                            </div>
                          </div>
                        )}
                        {product.attrs_json?.rsp && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">RSP</p>
                            <p className="mt-1 text-lg font-semibold">
                              {formatCurrency(Number(product.attrs_json.rsp))}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tags Tab */}
              <TabsContent value="tags" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Tag className="h-5 w-5" />
                      Product Tags ({tags.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tags.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {tags.map(tag => (
                            <Badge
                              key={tag.tag_id}
                              variant={tag.type === 'ai' ? 'default' : 'secondary'}
                              className="px-3 py-1.5 text-sm"
                            >
                              <Tag className="mr-1.5 h-3 w-3" />
                              {tag.name}
                              {tag.type && (
                                <span className="ml-1.5 text-xs opacity-70">({tag.type})</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                        <div className="space-y-2 border-t pt-4">
                          <p className="text-sm font-medium">Tag Details</p>
                          <div className="space-y-2">
                            {tags.map(tag => (
                              <div key={tag.tag_id} className="bg-muted rounded-lg p-3 text-sm">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium">{tag.name}</p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                      ID: {tag.tag_id} | Type: {tag.type || 'auto'}
                                    </p>
                                  </div>
                                  {tag.assigned_at && (
                                    <div className="text-muted-foreground text-right text-xs">
                                      <p>Assigned: {formatDate(tag.assigned_at)}</p>
                                      {tag.assigned_by && <p>By: {tag.assigned_by}</p>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground py-8 text-center">
                        <Tag className="mx-auto mb-2 h-12 w-12 opacity-50" />
                        <p>No tags assigned to this product</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Category Tab */}
              <TabsContent value="category" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FolderTree className="h-5 w-5" />
                      Category Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {product.category_name ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Category Name</p>
                          <Badge variant="default" className="mt-1 px-3 py-1.5 text-base">
                            {product.category_name}
                          </Badge>
                        </div>
                        {product.category_path && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">
                              Category Path
                            </p>
                            <p className="mt-1 font-mono text-base">{product.category_path}</p>
                          </div>
                        )}
                        {product.category_level !== undefined && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">
                              Category Level
                            </p>
                            <p className="mt-1 text-base">Level {product.category_level}</p>
                          </div>
                        )}
                        {product.category_id && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Category ID</p>
                            <p className="mt-1 font-mono text-base text-xs">
                              {product.category_id}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Badge variant={product.category_is_active ? 'default' : 'secondary'}>
                            {product.category_is_active ? 'Active Category' : 'Inactive Category'}
                          </Badge>
                        </div>
                        {product.ai_reasoning && (
                          <div className="border-t pt-4">
                            <p className="text-muted-foreground mb-2 text-sm font-medium">
                              AI Reasoning
                            </p>
                            <p className="bg-muted rounded-lg p-3 text-sm">
                              {product.ai_reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground py-8 text-center">
                        <FolderTree className="mx-auto mb-2 h-12 w-12 opacity-50" />
                        <p>No category assigned to this product</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Brand Tab */}
              <TabsContent value="brand" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5" />
                      Brand Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {product.brand_name ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Brand Name</p>
                          <Badge variant="default" className="mt-1 px-3 py-1.5 text-base">
                            {product.brand_name}
                          </Badge>
                        </div>
                        {product.manufacturer && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Manufacturer</p>
                            <p className="mt-1 text-base">{product.manufacturer}</p>
                          </div>
                        )}
                        {product.model && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Model</p>
                            <p className="mt-1 font-mono text-base">{product.model}</p>
                          </div>
                        )}
                        {product.series_range && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Series / Range</p>
                            <p className="mt-1 text-base">{product.series_range}</p>
                          </div>
                        )}
                        {product.mpn && (
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">MPN (Manufacturer Part Number)</p>
                            <p className="mt-1 font-mono text-base">{product.mpn}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground py-8 text-center">
                        <Building2 className="mx-auto mb-2 h-12 w-12 opacity-50" />
                        <p>No brand assigned to this product</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Current Pricing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Cost Ex VAT</p>
                        <p className="mt-1 text-2xl font-bold">
                          {formatCurrency(
                            product.cost_ex_vat ?? product.attrs_json?.cost_excluding ?? product.current_price
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Base Discount</p>
                        <p className="mt-1 text-xl font-semibold">
                          {(() => {
                            const discount = product.base_discount ?? product.attrs_json?.base_discount ?? 0;
                            const numDiscount = typeof discount === 'string' ? parseFloat(discount) || 0 : Number(discount) || 0;
                            return numDiscount.toFixed(2);
                          })()}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Cost After Discount</p>
                        <p className="mt-1 text-xl font-semibold">
                          {formatCurrency(
                            product.cost_after_discount ?? 
                            (() => {
                              const costExVat = product.cost_ex_vat ?? product.attrs_json?.cost_excluding ?? product.current_price ?? 0;
                              const discount = product.base_discount ?? product.attrs_json?.base_discount ?? 0;
                              const numDiscount = typeof discount === 'string' ? parseFloat(discount) || 0 : Number(discount) || 0;
                              return numDiscount > 0 ? costExVat - (costExVat * numDiscount / 100) : costExVat;
                            })()
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Cost Inc VAT</p>
                        <p className="mt-1 text-xl font-semibold">
                          {formatCurrency(product.attrs_json?.cost_including)}
                        </p>
                      </div>
                      {product.attrs_json?.rsp && (
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">
                            Recommended Selling Price (RSP)
                          </p>
                          <p className="mt-1 text-xl font-semibold">
                            {formatCurrency(Number(product.attrs_json.rsp))}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Currency</p>
                        <p className="mt-1 text-base">{product.currency || 'ZAR'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Price History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {priceHistory.length > 0 ? (
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                          {priceHistory.slice(0, 10).map((history, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                            >
                              <div>
                                <p className="font-medium">{formatCurrency(history.price)}</p>
                                <p className="text-muted-foreground text-xs">
                                  {formatDate(history.valid_from)} - {formatDate(history.valid_to)}
                                </p>
                              </div>
                              {history.is_current && <Badge variant="default">Current</Badge>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No price history available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Warehouse className="h-5 w-5" />
                      Stock Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Stock on Hand</p>
                        <p className="mt-1 text-2xl font-bold">{product.qty_on_hand ?? 0}</p>
                        {product.stock_as_of_ts && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            As of: {formatDate(product.stock_as_of_ts)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Stock Status</p>
                        {(() => {
                          const stockStatus = product.stock_status || product.attrs_json?.stock_status;
                          if (!stockStatus) return <p className="text-muted-foreground mt-1 text-xl">-</p>;
                          const lower = stockStatus.toLowerCase();
                          const colorClass = lower.includes('in stock') || lower === 'in stock'
                            ? 'text-green-600'
                            : lower.includes('low') || lower === 'low stock'
                              ? 'text-amber-600'
                              : lower.includes('out') || lower === 'out of stock'
                                ? 'text-red-600'
                                : '';
                          return <p className={`mt-1 text-xl font-semibold ${colorClass}`}>{stockStatus}</p>;
                        })()}
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">New Stock ETA</p>
                        {(() => {
                          const eta = product.new_stock_eta || product.attrs_json?.new_stock_eta;
                          return eta ? (
                            <p className="mt-1 text-xl font-semibold">{formatDate(eta)}</p>
                          ) : (
                            <p className="text-muted-foreground mt-1 text-xl">-</p>
                          );
                        })()}
                      </div>
                      {product.pack_size && (
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Pack Size</p>
                          <p className="mt-1 text-xl font-semibold">{product.pack_size}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <History className="h-5 w-5" />
                      Product Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">First Seen</p>
                        <p className="mt-1 text-base">{formatDate(product.first_seen_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">Last Seen</p>
                        <p className="mt-1 text-base">{formatDate(product.last_seen_at)}</p>
                      </div>
                      {product.previous_price_valid_to && (
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">
                            Previous Price Valid Until
                          </p>
                          <p className="mt-1 text-base">
                            {formatDate(product.previous_price_valid_to)}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
