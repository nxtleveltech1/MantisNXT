'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type Product = {
  supplier_product_id: string;
  supplier_sku: string;
  name_from_supplier: string;
};

interface ProductEnrichmentPanelProps {
  products: Product[];
  onEnrichmentComplete?: () => void;
}

export function ProductEnrichmentPanel({
  products,
  onEnrichmentComplete,
}: ProductEnrichmentPanelProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentResults, setEnrichmentResults] = useState<Map<string, any>>(new Map());
  const [applyChanges, setApplyChanges] = useState(false);
  const [webResearchEnabled, setWebResearchEnabled] = useState(true);

  const toggleProduct = (productId: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProducts(newSet);
  };

  const handleEnrich = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product');
      return;
    }

    setIsEnriching(true);
    setEnrichmentResults(new Map());

    try {
      const productIds = Array.from(selectedProducts);
      const response = await fetch('/api/tags/enrich/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          applyChanges,
          webResearchEnabled,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const results = new Map();
        for (const item of data.data || []) {
          results.set(item.supplier_product_id, item);
        }
        setEnrichmentResults(results);
        toast.success(`Enriched ${data.count || 0} product(s) successfully`);
        if (onEnrichmentComplete) {
          onEnrichmentComplete();
        }
      } else {
        toast.error(data.message || 'Failed to enrich products');
      }
    } catch (error) {
      toast.error('Failed to enrich products');
      console.error(error);
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Product Enrichment
        </CardTitle>
        <CardDescription>
          Use AI to enrich product information: correct names, generate descriptions, and suggest
          tags
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="apply-changes"
              checked={applyChanges}
              onCheckedChange={checked => setApplyChanges(checked === true)}
            />
            <Label htmlFor="apply-changes">Apply changes to database</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="web-research"
              checked={webResearchEnabled}
              onCheckedChange={checked => setWebResearchEnabled(checked === true)}
            />
            <Label htmlFor="web-research">Enable web research</Label>
          </div>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {products.map(product => {
            const isSelected = selectedProducts.has(product.supplier_product_id);
            const result = enrichmentResults.get(product.supplier_product_id);
            const nameIsSku = product.name_from_supplier === product.supplier_sku;

            return (
              <div
                key={product.supplier_product_id}
                className={`rounded-lg border p-3 ${
                  isSelected ? 'border-primary bg-primary/5' : ''
                } ${nameIsSku ? 'border-orange-500 bg-orange-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleProduct(product.supplier_product_id)}
                    disabled={isEnriching}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.name_from_supplier}</span>
                      {nameIsSku && (
                        <Badge variant="destructive" className="text-xs">
                          Name = SKU
                        </Badge>
                      )}
                      {result && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Enriched
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-sm">SKU: {product.supplier_sku}</div>
                    {result && (
                      <div className="mt-2 space-y-1 text-sm">
                        {result.product_name &&
                          result.product_name !== product.name_from_supplier && (
                            <div>
                              <span className="font-medium">New Name:</span> {result.product_name}
                            </div>
                          )}
                        {result.short_description && (
                          <div>
                            <span className="font-medium">Short Description:</span>{' '}
                            {result.short_description}
                          </div>
                        )}
                        {result.suggested_tags && result.suggested_tags.length > 0 && (
                          <div>
                            <span className="font-medium">Suggested Tags:</span>{' '}
                            {result.suggested_tags.map((t: any) => t.tag_name).join(', ')}
                          </div>
                        )}
                        {result.confidence && (
                          <div>
                            <span className="font-medium">Confidence:</span>{' '}
                            {(result.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleEnrich}
          disabled={isEnriching || selectedProducts.size === 0}
          className="w-full"
        >
          {isEnriching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enriching {selectedProducts.size} product(s)...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Enrich {selectedProducts.size} Selected Product(s)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
