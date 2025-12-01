'use client';

/**
 * Product Selection Wizard Wrapper
 * Adapts ProductToInventoryWizard for use in pricelist promotion flow
 * This component bridges the gap between the page-level API and the dialog-based wizard
 */

import { useState, useEffect, useCallback } from 'react';
import ProductToInventoryWizard from './ProductToInventoryWizard';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductSelectionWizardProps {
  pricelistId: string;
  supplierId: string;
  supplierName: string;
  onComplete: (result: { created: number; updated: number }) => void;
  onCancel: () => void;
}

export default function ProductSelectionWizard({
  pricelistId,
  supplierId,
  supplierName,
  onComplete,
  onCancel,
}: ProductSelectionWizardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);

  const loadPricelistProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/suppliers/${supplierId}/pricelists/${pricelistId}/products`
      );

      if (!response.ok) {
        throw new Error('Failed to load pricelist products');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load pricelist products');
      }

      // Extract product IDs from the pricelist
      const ids = data.data.map((product: unknown) => product.id);
      setProductIds(ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricelist products');
    } finally {
      setLoading(false);
    }
  }, [pricelistId, supplierId]);

  useEffect(() => {
    loadPricelistProducts();
  }, [loadPricelistProducts]);

  const handleWizardComplete = (results: unknown[]) => {
    // Transform wizard results to match expected format
    const created = results.filter(r => r.status === 'success').length;
    const updated = 0; // Wizard creates new inventory items, doesn't update existing ones

    onComplete({ created, updated });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-lg font-medium">Loading pricelist products...</p>
          <p className="text-muted-foreground mt-2 text-sm">Preparing product selection wizard</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2 font-medium">Failed to Load Products</p>
            <p className="text-sm">{error}</p>
          </AlertDescription>
        </Alert>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (productIds.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
        <h2 className="mb-2 text-xl font-bold">No Products Found</h2>
        <p className="mb-6 text-gray-600">This pricelist doesn&apos;t contain any products yet.</p>
        <button
          onClick={onCancel}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <ProductToInventoryWizard
      isOpen={true}
      onClose={onCancel}
      supplierId={supplierId}
      supplierName={supplierName}
      productIds={productIds}
      onComplete={handleWizardComplete}
    />
  );
}
