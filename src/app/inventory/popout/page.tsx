'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InventoryCatalogView from '@/components/inventory/InventoryCatalogView';

function PopoutContent() {
  const searchParams = useSearchParams();
  const initialParams = searchParams
    ? new URLSearchParams(searchParams.toString())
    : undefined;

  return (
    <div className="h-screen p-4">
      <InventoryCatalogView isPopOut initialParams={initialParams} />
    </div>
  );
}

export default function InventoryPopoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <PopoutContent />
    </Suspense>
  );
}
