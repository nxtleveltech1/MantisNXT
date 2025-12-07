'use client';

import React, { useState, useEffect } from 'react';
import ProductProfileDialog from '@/components/products/ProductProfileDialog';
import type { Product } from '@/lib/types/inventory';

interface ProductProfileBySKUProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductProfileBySKU({
  product,
  open,
  onOpenChange,
}: ProductProfileBySKUProps) {
  const [supplierProductId, setSupplierProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product) {
      findSupplierProduct();
    } else {
      setSupplierProductId(null);
    }
  }, [open, product]);

  const findSupplierProduct = async () => {
    if (!product.sku && !product.name) {
      console.warn('No SKU or name available to lookup supplier product');
      return;
    }

    setLoading(true);
    try {
      // Try to find supplier product by SKU first
      let searchTerm = product.sku || product.name || '';

      const response = await fetch(
        `/api/catalog/products?search=${encodeURIComponent(searchTerm)}&limit=1`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          // Found a match - use the first result
          setSupplierProductId(data.data[0].supplier_product_id);
        } else {
          // No match found - try by product name if SKU didn't work
          if (product.name && searchTerm !== product.name) {
            const nameResponse = await fetch(
              `/api/catalog/products?search=${encodeURIComponent(product.name)}&limit=1`
            );
            if (nameResponse.ok) {
              const nameData = await nameResponse.json();
              if (nameData.data && nameData.data.length > 0) {
                setSupplierProductId(nameData.data[0].supplier_product_id);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error finding supplier product:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state or the product profile dialog
  if (loading) {
    return (
      <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2" />
          <p className="text-muted-foreground text-sm">Looking up product details...</p>
        </div>
      </div>
    );
  }

  if (!supplierProductId) {
    return (
      <div
        className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center"
        onClick={() => onOpenChange(false)}
      >
        <div
          className="bg-card mx-4 max-w-md rounded-lg border p-6"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="mb-2 text-lg font-semibold">Product Not Found</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Could not find a matching supplier product for this inventory item. The product may not
            exist in the supplier catalog.
          </p>
          <div className="mb-4 space-y-1 text-sm">
            <p>
              <strong>SKU:</strong> {product.sku || 'N/A'}
            </p>
            <p>
              <strong>Name:</strong> {product.name}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProductProfileDialog productId={supplierProductId} open={open} onOpenChange={onOpenChange} />
  );
}







