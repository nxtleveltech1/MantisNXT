'use client';

/**
 * Pop-out window page for Supplier Inventory Portfolio
 * Displays the catalog table in a full-screen optimized layout
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CatalogTable } from '@/components/catalog/CatalogTable';

function PopOutContent() {
  const searchParams = useSearchParams();
  
  // Convert searchParams to URLSearchParams for CatalogTable
  const initialParams = React.useMemo(() => {
    const params = new URLSearchParams();
    searchParams?.forEach((value, key) => {
      params.set(key, value);
    });
    return params;
  }, [searchParams]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="border-b bg-card px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Supplier Inventory Portfolio</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Pop-out view for expanded product listings and filtering
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-[95%]">
          <CatalogTable initialParams={initialParams} isPopOut={true} />
        </div>
      </div>
    </div>
  );
}

export default function CatalogPopOutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-muted-foreground text-sm">Loading catalog...</p>
          </div>
        </div>
      }
    >
      <PopOutContent />
    </Suspense>
  );
}

