'use client';

import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type UnmatchedItem = {
  id: string;
  supplierId: string;
  supplierSku: string;
  description: string;
  cost: number | null;
  currency: string | null;
  createdAt: string | null;
  versionId?: string;
  status?: string | null;
  aiConfidence?: number | null;
  aiReasoning?: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
  path: string;
};

export default function ExceptionsPage() {
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [categorySelections, setCategorySelections] = useState<Record<string, string>>({});
  const [legacyAssignments, setLegacyAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [unmatchedRes, categoriesRes] = await Promise.all([
        fetch('/api/unmatched'),
        fetch('/api/categories'),
      ]);

      if (unmatchedRes.ok) {
        const payload: UnmatchedItem[] = await unmatchedRes.json();
        setUnmatchedItems(Array.isArray(payload) ? payload : []);
      } else {
        throw new Error('Failed to load unmatched items');
      }

      if (categoriesRes.ok) {
        const categoryData: CategoryOption[] = await categoriesRes.json();
        setCategories(
          (Array.isArray(categoryData) ? categoryData : []).map(category => ({
            id: category.id,
            name: category.name,
            path: category.path,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch unmatched data:', error);
      toast.error('Unable to load exception data right now.');
      setUnmatchedItems([]);
    }
  };

  const isCoreMode = useMemo(
    () => unmatchedItems.some(item => item.status || item.aiConfidence !== undefined),
    [unmatchedItems]
  );

  const totalValue = useMemo(
    () =>
      unmatchedItems.reduce((sum, item) => {
        if (!item.cost) return sum;
        return sum + item.cost;
      }, 0),
    [unmatchedItems]
  );

  const handleResolve = async (item: UnmatchedItem) => {
    setResolvingId(item.id);
    try {
      if (isCoreMode) {
        const selectedCategory = categorySelections[item.id];
        if (!selectedCategory) {
          throw new Error('Select a category before resolving this item.');
        }

        const response = await fetch('/api/category/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierProductId: item.id,
            categoryId: selectedCategory,
            method: 'manual',
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to assign category');
        }
        toast.success('Category assignment saved');
      } else {
        const masterSku = legacyAssignments[item.id]?.trim();
        if (!masterSku) {
          throw new Error('Master SKU is required');
        }
        const response = await fetch('/api/unmatched', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unmatchedId: item.id, masterSku }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to create cross-reference');
        }
        toast.success('Cross-reference created successfully');
      }

      await loadData();
    } catch (error) {
      console.error('Failed to resolve unmatched item:', error);
      toast.error(error instanceof Error ? error.message : 'Could not resolve record.');
    } finally {
      setResolvingId(null);
    }
  };

  const formatCurrency = (amount: number | null | undefined, currency = 'USD') => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const formatTimestamp = (value: string | null | undefined) => {
    if (!value) return 'Unknown';
    return new Date(value).toLocaleString();
  };

  return (
    <AppLayout
      title="Exception Handling"
      breadcrumbs={[
        { label: 'Category Management', href: '/catalog/categories' },
        { label: 'Exceptions' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Exception Handling</h1>
            <p className="text-muted-foreground">
              Resolve supplier records that could not be matched automatically.
            </p>
          </div>
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {unmatchedItems.length} outstanding
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unmatched SKUs</CardTitle>
              <XCircle className="text-destructive h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unmatchedItems.length}</div>
              <p className="text-muted-foreground text-xs">Require manual action</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              <p className="text-muted-foreground text-xs">Value tied to unmatched SKUs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(unmatchedItems.map(item => item.supplierId)).size}
              </div>
              <p className="text-muted-foreground text-xs">Unique suppliers with exceptions</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Unmatched SKUs</CardTitle>
            <CardDescription>
              {isCoreMode
                ? 'Assign categories to supplier products that could not be mapped.'
                : 'Create cross-references to resolve unmatched supplier SKUs.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unmatchedItems.length === 0 ? (
              <div className="space-y-2 py-10 text-center">
                <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
                <p className="text-muted-foreground">No unmatched records. All good to go!</p>
              </div>
            ) : (
              unmatchedItems.map(item => {
                const confidence = item.aiConfidence ?? 0;
                return (
                  <div key={item.id} className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{item.supplierId}</Badge>
                          <span className="font-mono text-sm">{item.supplierSku}</span>
                          <span className="text-muted-foreground text-sm">
                            {formatCurrency(item.cost, item.currency ?? 'USD')}
                          </span>
                        </div>
                        <p className="text-sm">{item.description}</p>
                        <p className="text-muted-foreground text-xs">
                          Added {formatTimestamp(item.createdAt)}
                        </p>
                      </div>
                      {isCoreMode && (
                        <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">Status: {item.status ?? 'pending'}</Badge>
                          {item.aiConfidence !== undefined && (
                            <Badge variant="outline">
                              {(confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {isCoreMode ? (
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Select
                          value={categorySelections[item.id] ?? ''}
                          onValueChange={value =>
                            setCategorySelections(prev => ({
                              ...prev,
                              [item.id]: value,
                            }))
                          }
                          disabled={resolvingId === item.id}
                        >
                          <SelectTrigger className="md:w-80">
                            <SelectValue placeholder="Select category…" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.path}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleResolve(item)}
                            disabled={resolvingId === item.id}
                          >
                            {resolvingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Assign Category'
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setUnmatchedItems(prev =>
                                prev.filter(candidate => candidate.id !== item.id)
                              )
                            }
                          >
                            <X className="mr-1 h-4 w-4" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Input
                          placeholder="Enter master SKU"
                          value={legacyAssignments[item.id] ?? ''}
                          onChange={event =>
                            setLegacyAssignments(prev => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          className="md:w-64"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleResolve(item)}
                          disabled={resolvingId === item.id}
                        >
                          {resolvingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Create Cross-reference'
                          )}
                        </Button>
                      </div>
                    )}

                    {item.aiReasoning && (
                      <p className="text-muted-foreground border-t pt-2 text-xs">
                        AI reasoning: {item.aiReasoning}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
