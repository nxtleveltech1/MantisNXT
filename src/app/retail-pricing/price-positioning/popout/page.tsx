'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SellingPricesTable } from '@/components/retail-pricing/SellingPricesTable';

function PopoutContent() {
  const searchParams = useSearchParams();
  const initialParams = searchParams
    ? new URLSearchParams(searchParams.toString())
    : undefined;

  return (
    <div className="bg-background h-screen p-4">
      <SellingPricesTable isPopOut initialParams={initialParams} />
    </div>
  );
}

export default function RetailPricePositioningPopoutPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2" />
            <p className="text-muted-foreground text-sm">Loading…</p>
          </div>
        </div>
      }
    >
      <PopoutContent />
    </Suspense>
  );
}
